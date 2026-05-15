import { useState } from 'react';
import { 
  writeBatch, 
  doc, 
  collection, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Order, Product, Customer, UserProfile } from '../types';
import { toast } from 'sonner';
import { parseAsSaoPaulo, getShiftDate, nowInSaoPaulo } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { usePaymentFees } from './usePaymentFees';

export function useCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { calculateNet } = usePaymentFees();

  const finalizeCheckout = async (
    order: Order,
    checkoutAmount: number,
    checkoutPayments: { 
      method: string; 
      amount: number; 
      itemAssignments?: { itemIndex: number; quantity: number }[] 
    }[],
    checkoutDate: string,
    checkoutCustomerId: string,
    checkoutDiscount: number,
    checkoutAdjustment: number,
    user: UserProfile,
    products: Product[],
    customers: Customer[],
    isPartial: boolean = false
  ) => {
    setIsProcessing(true);
    const batch = writeBatch(db);

    try {
      const finalAmount = checkoutAmount;
      const targetCustomerId = checkoutCustomerId === 'none' ? '' : (checkoutCustomerId || order.customerId);
      
      // Items to process for inventory and cost
      // If partial, only process items that were explicitly assigned
      // If not partial, process all items in the order
      const itemsToProcess: { productId: string; quantity: number; costPrice?: number; productName: string; subtotal: number }[] = [];
      
      if (isPartial) {
        checkoutPayments.forEach(p => {
          p.itemAssignments?.forEach(assignment => {
            const originalItem = order.items[assignment.itemIndex];
            if (originalItem) {
              const existing = itemsToProcess.find(i => i.productId === originalItem.productId && i.costPrice === originalItem.costPrice);
              if (existing) {
                existing.quantity += assignment.quantity;
                existing.subtotal += (originalItem.price * assignment.quantity);
              } else {
                itemsToProcess.push({
                  productId: originalItem.productId,
                  productName: originalItem.productName,
                  quantity: assignment.quantity,
                  costPrice: originalItem.costPrice,
                  subtotal: originalItem.price * assignment.quantity
                });
              }
            }
          });
        });
      } else {
        itemsToProcess.push(...order.items);
      }

      const orderRef = doc(db, 'open_orders', order.id);
      
      let shouldCloseOrder = !isPartial;
      let remainingItems = [];
      let newTotal = 0;

      if (isPartial) {
        remainingItems = [...order.items].map((item, idx) => {
          const totalAssigned = checkoutPayments.reduce((sum, p) => {
            const assignment = p.itemAssignments?.find(a => a.itemIndex === idx);
            return sum + (assignment?.quantity || 0);
          }, 0);
          
          const newQty = item.quantity - totalAssigned;
          return {
            ...item,
            quantity: newQty,
            subtotal: newQty * item.price
          };
        }).filter(item => item.quantity > 0);

        newTotal = remainingItems.reduce((sum, item) => sum + item.subtotal, 0);
        if (remainingItems.length === 0) {
          shouldCloseOrder = true;
        }
      }

      if (shouldCloseOrder) {
        batch.update(orderRef, {
          status: 'closed',
          closedAt: serverTimestamp(),
          closedShiftDate: getShiftDate(),
          totalAmount: isPartial ? (order.totalAmount - newTotal) : finalAmount,
          payments: checkoutPayments.map(p => ({
            method: p.method,
            amount: p.amount,
            date: nowInSaoPaulo().toISOString(),
            itemAssignments: p.itemAssignments || []
          })),
          customerId: targetCustomerId
        });
      } else {
        batch.update(orderRef, {
          items: remainingItems,
          totalAmount: newTotal
        });
      }

      // 2. Update Customer Balance and Stats
      if (targetCustomerId) {
        const customerRef = doc(db, 'customers', targetCustomerId);
        const customer = customers.find(c => c.id === targetCustomerId);
        
        if (customer) {
          const fiadoAmount = checkoutPayments
            .filter(p => p.method === 'FIADO')
            .reduce((sum, p) => sum + p.amount, 0);
          
          const saldoUsedAmount = checkoutPayments
            .filter(p => p.method === 'SALDO')
            .reduce((sum, p) => sum + p.amount, 0);

          const totalPaid = checkoutPayments.reduce((sum, p) => sum + p.amount, 0);
          
          // In partial checkout, surplus logic might be different, but usually we just pay exact.
          const surplus = isPartial ? 0 : (totalPaid - finalAmount);
          const balanceImpact = surplus - fiadoAmount - saldoUsedAmount;

          batch.update(customerRef, {
            totalSpent: increment(finalAmount),
            orderCount: shouldCloseOrder ? increment(1) : 0,
            balance: increment(balanceImpact),
            lastVisit: serverTimestamp()
          });
        }
      }

      // 3. Inventory Aggregation
      let totalCost = 0;
      const inventoryUpdates: Record<string, {
        stockReduction: number;
        mlReduction: number;
        originalStock: number;
        originalVol: number;
        volPerUnit: number;
        isDoseControl: boolean;
      }> = {};

      for (const item of itemsToProcess) {
        totalCost += (item.costPrice || 0) * item.quantity;

        if (!item.productId.startsWith('manual_') && !item.productId.startsWith('game_')) {
          const baseProductId = item.productId.split('_')[0];
          const product = products.find(p => p.id === baseProductId);
          
          if (product) {
            // Recipe Logic
            if (product.ingredients && product.ingredients.length > 0) {
              for (const ing of product.ingredients) {
                const ingProduct = products.find(p => p.id === ing.productId);
                if (ingProduct) {
                  if (!inventoryUpdates[ing.productId]) {
                    inventoryUpdates[ing.productId] = {
                      stockReduction: 0,
                      mlReduction: 0,
                      originalStock: ingProduct.stock || 0,
                      originalVol: ingProduct.currentBottleVolume !== undefined ? ingProduct.currentBottleVolume : 0,
                      volPerUnit: ingProduct.volumePerUnit || 0,
                      isDoseControl: !!ingProduct.isDoseControl
                    };
                  }
                  inventoryUpdates[ing.productId].stockReduction += (ing.quantity * item.quantity);
                }
              }
            }

            // Dose Control Logic
            if (product.isDoseControl && product.linkedProductId) {
              const bottleId = product.linkedProductId;
              const bottle = products.find(p => p.id === bottleId);
              if (bottle) {
                if (!inventoryUpdates[bottleId]) {
                  inventoryUpdates[bottleId] = {
                    stockReduction: 0,
                    mlReduction: 0,
                    originalStock: bottle.stock || 0,
                    originalVol: bottle.currentBottleVolume !== undefined ? bottle.currentBottleVolume : 0,
                    volPerUnit: bottle.volumePerUnit || 0,
                    isDoseControl: true
                  };
                }
                inventoryUpdates[bottleId].mlReduction += (product.doseSize || 0) * item.quantity;
              }
            } else if (product.isDoseControl && !product.linkedProductId) {
              if (!inventoryUpdates[product.id]) {
                inventoryUpdates[product.id] = {
                  stockReduction: 0,
                  mlReduction: 0,
                  originalStock: product.stock || 0,
                  originalVol: product.currentBottleVolume !== undefined ? product.currentBottleVolume : 0,
                  volPerUnit: product.volumePerUnit || 0,
                  isDoseControl: true
                };
              }
              inventoryUpdates[product.id].stockReduction += item.quantity;
            } else {
              if (!inventoryUpdates[product.id]) {
                inventoryUpdates[product.id] = {
                  stockReduction: 0,
                  mlReduction: 0,
                  originalStock: product.stock || 0,
                  originalVol: 0,
                  volPerUnit: 0,
                  isDoseControl: false
                };
              }
              inventoryUpdates[product.id].stockReduction += item.quantity;
            }
          }
        }
      }

      // 4. Apply Inventory Updates in Batch
      for (const [productId, update] of Object.entries(inventoryUpdates)) {
        const productRef = doc(db, 'products', productId);
        if (update.isDoseControl) {
          let newCurrentVolume = update.originalVol - update.mlReduction;
          let newStock = update.originalStock - update.stockReduction;

          if (update.volPerUnit > 0) {
            while (newCurrentVolume < 0 && newStock > 0) {
              newStock -= 1;
              newCurrentVolume += update.volPerUnit;
            }
          }
          batch.update(productRef, {
            stock: Math.max(0, newStock),
            currentBottleVolume: Math.max(0, newCurrentVolume)
          });
        } else {
          batch.update(productRef, {
            stock: Math.max(0, update.originalStock - update.stockReduction)
          });
        }
      }

      // 5. Game Sessions
      for (const item of itemsToProcess) {
        if (item.productId.startsWith('game_')) {
          const splitId = item.productId.split('_');
          const modalityId = splitId[1];
          const modalityName = item.productName.replace('[JOGO] ', '');
          
          const sessionRef = doc(collection(db, 'game_sessions'));
          batch.set(sessionRef, {
            modalityId,
            modalityName,
            amount: item.subtotal,
            date: serverTimestamp(),
            dataExpediente: getShiftDate(),
            userId: user.uid,
            userName: user.displayName || user.email,
            orderId: order.id
          });
        }
      }

      // 6. Transactions
      for (const payment of checkoutPayments) {
        let paymentCost = 0;
        if (payment.itemAssignments && payment.itemAssignments.length > 0) {
          paymentCost = payment.itemAssignments.reduce((sum, assignment) => {
            const item = order.items[assignment.itemIndex];
            if (item) {
              return sum + (item.costPrice || 0) * assignment.quantity;
            }
            return sum;
          }, 0);
        } else {
          paymentCost = finalAmount > 0 ? (payment.amount / finalAmount) * totalCost : 0;
        }

        const { netAmount, feeAmount } = calculateNet(payment.amount, payment.method);

        const transRef = doc(collection(db, 'transactions'));
        batch.set(transRef, {
          type: 'income',
          category: 'Vendas',
          amount: payment.amount,
          netAmount,
          feeAmount,
          cost: paymentCost,
          description: `${isPartial ? '[PARCIAL] ' : ''}Comanda: ${order.customerName} (${payment.method})${checkoutDiscount > 0 ? ` (Desc: R$ ${checkoutDiscount})` : ''}${checkoutAdjustment !== 0 ? ` (Ajuste: R$ ${checkoutAdjustment})` : ''}`,
          date: serverTimestamp(),
          dataExpediente: getShiftDate(),
          orderId: order.id,
          customerId: targetCustomerId,
          paymentMethod: payment.method,
          isFiado: payment.method === 'FIADO',
          isSaldo: payment.method === 'SALDO'
        });
      }

      await batch.commit();
      toast.success(isPartial ? 'Pagamento parcial registrado' : 'Recebimento finalizado com sucesso');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return { finalizeCheckout, isProcessing };
}

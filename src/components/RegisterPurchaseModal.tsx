import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Supplier, Product, Purchase, Category } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Combobox } from './ui/combobox';
import { ProductFormModal } from './ProductFormModal';
import { toast } from 'sonner';
import { getShiftDate } from '../lib/utils';
import { ShoppingCart, Plus, Trash2, Package } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

export function RegisterPurchaseModal({ suppliers }: { suppliers: Supplier[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number | ''; price: number | '' }[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productModalInitialName, setProductModalInitialName] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    });
    const subCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category)));
    });
    return () => {
      unsubscribeProducts();
      subCategories();
    };
  }, [isOpen]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: '', price: '' }]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        const fullName = product.subcategory ? `${product.name} - ${product.subcategory}` : product.name;
        newItems[index] = { ...newItems[index], productId: value, productName: fullName, price: product.cost || '' };
        setItems(newItems);
      } else {
        // It's a custom created product string. Open Product Modal!
        setProductModalInitialName(value);
        setActiveItemIndex(index);
        setIsProductModalOpen(true);
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
      setItems(newItems);
    }
  };

  const handleProductCreated = (product: Product & { id: string }) => {
    if (activeItemIndex !== null) {
      const newItems = [...items];
      const fullName = product.subcategory ? `${product.name} - ${product.subcategory}` : product.name;
      newItems[activeItemIndex] = { ...newItems[activeItemIndex], productId: product.id, productName: fullName, price: product.cost || '' };
      setItems(newItems);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
  };

  const calculateSubtotal = (quantity: number | '', price: number | '') => {
    return (Number(quantity) || 0) * (Number(price) || 0);
  };

  const handleSave = async () => {
    if (!supplierId) {
      toast.error('Selecione um fornecedor.');
      return;
    }
    
    const validItems = items.filter(item => item.productId && Number(item.quantity) > 0 && Number(item.price) >= 0);
    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item válido com quantidade maior que zero.');
      return;
    }

    setIsSaving(true);
    let finalSupplierId = supplierId;
    let finalSupplierName = suppliers.find(s => s.id === supplierId)?.name;
    const totalAmount = calculateTotal();
    const shiftDate = getShiftDate();

    try {
      // 0. Create new supplier if it's a custom string
      if (!finalSupplierName) {
        finalSupplierName = supplierId; // User typed a new name
        const supplierDoc = await addDoc(collection(db, 'suppliers'), {
          name: finalSupplierName,
          category: 'Geral',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        finalSupplierId = supplierDoc.id;
      }

      // 1. Process items: calculate subtotals
      // (Since custom products are now created upfront via the ProductFormModal,
      // all validItems should already have real product IDs that correspond to existing products.)
      const purchaseItems = [];
      for (const item of validItems) {
        let finalProductId = item.productId;
        let finalProductName = item.productName;
        let finalProductPrice = Number(item.price);
        
        purchaseItems.push({
          productId: finalProductId,
          productName: finalProductName,
          quantity: Number(item.quantity),
          price: finalProductPrice,
          subtotal: calculateSubtotal(item.quantity, item.price)
        });
      }

      // 2. Add to 'purchases' log
      await addDoc(collection(db, 'purchases'), {
        supplierId: finalSupplierId,
        supplierName: finalSupplierName,
        items: purchaseItems,
        totalAmount,
        date: serverTimestamp(),
        shiftDate
      });

      // 3. Add to 'transactions' (Finance)
      await addDoc(collection(db, 'transactions'), {
        type: 'expense',
        category: 'Compra de Estoque',
        amount: totalAmount,
        description: `Compra do fornecedor: ${finalSupplierName}`,
        date: serverTimestamp(),
        shiftDate,
        isPaid: true
      });

      // 4. Update 'products' stock
      for (const item of purchaseItems) {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          await updateDoc(productRef, {
            stock: currentStock + item.quantity,
            cost: item.price // Update cost price to the latest purchase price (business logic)
          });
        }
      }

      toast.success('Compra registrada e estoque atualizado!');
      setIsOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'purchases');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSupplierId('');
    setItems([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger
        nativeButton={true}
        render={
          <Button 
            className="w-full md:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl gap-2 md:gap-3 font-bold tracking-widest uppercase shadow-lg bg-green-600 hover:bg-green-700 text-[10px] md:text-sm"
          >
            <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
            Registrar Compra
          </Button>
        }
      />
      <DialogContent className="bg-[#0b1120] border-border max-w-3xl text-white p-0 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
        <div className="p-6 md:p-8 border-b border-white/5 relative flex-shrink-0 bg-gradient-to-b from-green-500/10 to-transparent">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-green-500/20 flex items-center justify-center border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-50" />
              <ShoppingCart className="w-6 h-6 md:w-8 md:h-8 text-green-500 relative z-10" />
            </div>
            <div>
              <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1.5">
                Registrar <span className="text-green-500">Compra</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-green-500/60">
                  Fluxo de Fornecedores & Estoque
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8 custom-scrollbar">
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">Informações Iniciais</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Fornecedor</label>
              <Combobox
                options={suppliers.map(s => ({ label: s.name, value: s.id }))}
                value={supplierId}
                onSelect={setSupplierId}
                placeholder="Selecione ou crie o fornecedor..."
                allowCustom={true}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Itens da Compra</h3>
              <Button size="sm" variant="outline" onClick={handleAddItem} className="gap-2 text-[10px] uppercase font-bold tracking-widest h-8 border-primary/20 hover:bg-primary/10">
                <Plus className="w-3 h-3" /> Adicionar Produto
              </Button>
            </div>
            <ProductFormModal
              isOpen={isProductModalOpen}
              onOpenChange={setIsProductModalOpen}
              initialName={productModalInitialName}
              products={products}
              categories={categories}
              onSaveSuccess={handleProductCreated}
            />

            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs uppercase tracking-widest font-bold bg-[#111827]/50 rounded-xl border border-dashed border-border/50">
                Nenhum item adicionado.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-[#111827]/80 p-4 rounded-xl border border-border/50 relative group">
                    <button 
                      onClick={() => handleRemoveItem(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      title="Remover Item"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="flex-1 w-full space-y-1">
                      <label className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Produto</label>
                      <Combobox
                        options={products.map(p => {
                          const fullName = p.subcategory ? `${p.name} - ${p.subcategory}` : p.name;
                          return { 
                            label: `${fullName} (Estoque: ${p.stock})`, 
                            value: p.id,
                            searchName: fullName,
                            displayValue: fullName
                          };
                        })}
                        value={item.productId}
                        onSelect={(val) => handleUpdateItem(index, 'productId', val)}
                        placeholder="Buscar ou criar produto..."
                        allowCustom={true}
                      />
                    </div>
                    <div className="w-full md:w-24 space-y-1">
                      <label className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Qtd</label>
                      <Input 
                        type="number" 
                        min="0"
                        className="h-12 bg-black/40 border-border font-bold text-center w-full"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="w-full md:w-32 space-y-1">
                      <label className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Custo Unit (R$)</label>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="h-12 bg-black/40 border-border font-bold text-right w-full"
                        value={item.price}
                        onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="w-full md:w-24 space-y-1">
                      <label className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Subtotal</label>
                      <div className="h-12 flex items-center justify-end font-bold text-white pr-2 text-sm w-full">
                        R$ {calculateSubtotal(item.quantity, item.price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 md:p-8 bg-black/40 border-t border-white/5 mt-auto flex flex-col md:flex-row items-center justify-between gap-6 flex-shrink-0">
          <div className="flex items-center gap-4 w-full md:w-auto p-4 md:p-5 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <ShoppingCart className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Total Consolidado</p>
              <p className="text-3xl font-black text-white">R$ {calculateTotal().toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving} className="flex-1 md:w-32 h-12 font-bold uppercase tracking-widest text-[9px] border-white/10 hover:bg-white/5">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || items.length === 0 || !supplierId} 
              className="flex-[2] md:w-48 h-12 font-black uppercase tracking-[0.15em] text-[10px] bg-green-600 hover:bg-green-700 shadow-xl shadow-green-900/30 rounded-xl border border-green-400/20"
            >
              {isSaving ? 'Gravando...' : 'Finalizar Compra'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

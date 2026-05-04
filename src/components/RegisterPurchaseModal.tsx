import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { Supplier, Product, Purchase, Category } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Combobox } from './ui/combobox';
import { ProductForm } from './Product';
import { toast } from 'sonner';
import { getShiftDate } from '../lib/utils';
import { ShoppingCart, Plus, Trash2, Package } from 'lucide-react';
import { Badge } from './ui/badge';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { useFetchCollection } from '../hooks/useFetchCollection';

export function RegisterPurchaseModal({ suppliers }: { suppliers: Supplier[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const productConstraints = React.useMemo(() => [orderBy('name', 'asc')], []);
  
  const { data: products } = useFetchCollection<Product>('products', {
    constraints: productConstraints,
    enabled: isOpen
  });
  
  const { data: categories } = useFetchCollection<Category>('categories', {
    enabled: isOpen
  });

  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number | ''; price: number | '' }[]>([]);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 16));

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productModalInitialName, setProductModalInitialName] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

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
    
    const selectedDate = new Date(purchaseDate);
    const shiftDate = getShiftDate(selectedDate);
    const firestoreTimestamp = Timestamp.fromDate(selectedDate);

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
      // (Since custom products are now created upfront via the ProductForm,
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
        date: firestoreTimestamp,
        shiftDate
      });

      // 3. Add to 'transactions' (Finance)
      await addDoc(collection(db, 'transactions'), {
        type: 'expense',
        category: 'Compra de Estoque',
        amount: totalAmount,
        description: `Compra do fornecedor: ${finalSupplierName}`,
        date: firestoreTimestamp,
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
    setPurchaseDate(new Date().toISOString().slice(0, 16));
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
      <DialogContent className="bg-[#0b1120] border-white/10 max-w-4xl text-white p-0 overflow-hidden flex flex-col h-[95vh] md:h-[90vh]">
        <div className="p-6 md:p-10 border-b border-white/5 relative flex-shrink-0 bg-gradient-to-br from-green-600/10 via-transparent to-transparent">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-green-500/20 flex items-center justify-center border border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.1)] relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />
              <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-green-500 relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5">Módulo de Suprimento</Badge>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              </div>
              <DialogTitle className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                Registrar <span className="text-green-500">Aporte</span>
              </DialogTitle>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 md:space-y-12 custom-scrollbar bg-black/20">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground ml-1">Terminal de Fornecedor</label>
              <Combobox
                options={suppliers.map(s => ({ label: s.name, value: s.id }))}
                value={supplierId}
                onSelect={setSupplierId}
                placeholder="Identificar parceiro comercial..."
                allowCustom={true}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground ml-1">Timestamp Operacional</label>
              <Input
                type="datetime-local"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="h-14 bg-white/5 border-white/10 focus:border-green-500/50 font-black text-center w-full rounded-xl uppercase tracking-widest text-[10px] sm:text-xs"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <Package className="w-4 h-4 text-green-500" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Manifesto de Itens</h3>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleAddItem} 
                className="gap-2 text-[10px] uppercase font-black tracking-[0.2em] h-10 border-white/10 bg-white/5 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30 transition-all group px-4"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> 
                Acrescentar Lote
              </Button>
            </div>
            
            <ProductForm
              isOpen={isProductModalOpen}
              onOpenChange={setIsProductModalOpen}
              initialName={productModalInitialName}
              products={products}
              categories={categories}
              onSaveSuccess={handleProductCreated}
            />

            {items.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.02] rounded-[32px] border border-dashed border-white/5 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                  <Package className="w-8 h-8 opacity-10" />
                </div>
                <p className="font-black tracking-[0.3em] uppercase text-[10px] text-muted-foreground px-10 leading-relaxed text-center">Nenhuma especificação técnica de produto vinculada à operação</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col md:grid md:grid-cols-12 gap-5 items-start md:items-end bg-white/[0.02] p-5 md:p-8 rounded-[32px] border border-white/5 relative group hover:bg-white/[0.04] transition-all hover:border-white/10 shadow-xl">
                    <button 
                      onClick={() => handleRemoveItem(index)}
                      className="absolute -top-3 -right-3 w-10 h-10 bg-red-600 text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-2xl z-10 border border-red-500 shadow-red-900/50"
                      title="Excluir Lote"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <div className="col-span-12 md:col-span-5 space-y-3 w-full">
                      <label className="text-[10px] font-black tracking-[0.2em] uppercase text-primary ml-1">Especificação SKU</label>
                      <Combobox
                        options={products.map(p => {
                          const fullName = p.subcategory ? `${p.name} - ${p.subcategory}` : p.name;
                          return { 
                            label: `${fullName} [EST: ${p.stock}]`, 
                            value: p.id,
                            searchName: fullName,
                            displayValue: fullName
                          };
                        })}
                        value={item.productId}
                        onSelect={(val) => handleUpdateItem(index, 'productId', val)}
                        placeholder="Mapear origem..."
                        allowCustom={true}
                      />
                    </div>

                    <div className="col-span-6 md:col-span-2 space-y-3 w-full">
                      <label className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground ml-1">Volume</label>
                      <Input 
                        type="number" 
                        min="0"
                        className="h-14 bg-black/40 border-white/10 focus:border-green-500/50 font-black text-center w-full rounded-2xl text-sm font-mono tabular-nums"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                        placeholder="00"
                      />
                    </div>

                    <div className="col-span-6 md:col-span-2 space-y-3 w-full">
                      <label className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground ml-1">Preço Un.</label>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="h-14 bg-black/40 border-white/10 focus:border-green-500/50 font-black text-right w-full rounded-2xl text-sm font-mono tabular-nums pr-5"
                        value={item.price}
                        onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                        placeholder="0,00"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-3 space-y-3 w-full">
                      <label className="text-[10px] font-black tracking-[0.2em] uppercase text-green-500 ml-1">Consolidado Item</label>
                      <div className="h-14 flex items-center justify-end bg-green-500/5 border border-green-500/10 rounded-2xl px-5 font-black text-green-500 text-sm w-full font-mono tabular-nums leading-none shadow-inner">
                        R$ {calculateSubtotal(item.quantity, item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 md:p-10 bg-[#080c17] border-t border-white/5 mt-auto flex flex-col md:flex-row items-center justify-between gap-8 flex-shrink-0">
          <div className="flex items-center gap-6 w-full md:w-auto p-5 md:p-6 bg-white/[0.03] rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-y-0 left-0 w-1 bg-green-500" />
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <ShoppingCart className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground mb-1">Montante Financeiro Total</p>
              <p className="text-3xl md:text-4xl font-black text-white leading-none font-mono">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving} className="flex-1 md:w-40 h-14 font-black uppercase tracking-[0.2em] text-[10px] border-white/10 hover:bg-white/5 rounded-2xl transition-all">
              Abortar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || items.length === 0 || !supplierId} 
              className="flex-[2] md:w-64 h-14 font-black uppercase tracking-[0.3em] text-[11px] bg-green-600 hover:bg-green-700 shadow-2xl shadow-green-900/40 rounded-2xl border border-green-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSaving ? 'Processando Base...' : 'Validar Operação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

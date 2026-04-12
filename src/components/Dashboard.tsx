import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore';
import { Order, Product, UserProfile, Customer, Category } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Plus, Search, ShoppingCart, CheckCircle2, ChevronRight, LayoutGrid, List, Zap, Activity, Clock, TrendingUp, TrendingDown, Trash2, ShieldCheck, UserPlus, Users, Table as TableIcon, X, Check, Filter, Receipt, Package, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { setDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function Dashboard({ user }: { user: UserProfile }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrderTab, setNewOrderTab] = useState<'table' | 'fiel' | 'new'>('table');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [letterFilter, setLetterFilter] = useState('TODOS');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isLinkingCustomer, setIsLinkingCustomer] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'open_orders'), 
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'open_orders'));

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    return () => {
      unsubscribe();
      unsubProducts();
      unsubCustomers();
      unsubCategories();
    };
  }, []);

  const handleCreateOrder = async () => {
    let customerName = '';
    let customerId = '';
    let type: 'table' | 'customer' = 'table';

    setIsCreatingOrder(true);
    try {
      if (newOrderTab === 'table') {
        if (!newCustomerName.trim()) {
          setIsCreatingOrder(false);
          return;
        }
        customerName = newCustomerName;
        type = 'table';
      } else if (newOrderTab === 'fiel') {
        if (!selectedCustomerId) {
          setIsCreatingOrder(false);
          return;
        }
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) {
          setIsCreatingOrder(false);
          return;
        }
        customerName = customer.name;
        customerId = customer.id;
        type = 'customer';
      } else if (newOrderTab === 'new') {
        if (!newCustomerName.trim()) {
          setIsCreatingOrder(false);
          return;
        }
        try {
          const docRef = await addDoc(collection(db, 'customers'), {
            name: newCustomerName,
            createdAt: serverTimestamp()
          });
          customerName = newCustomerName;
          customerId = docRef.id;
          type = 'customer';
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'customers');
          setIsCreatingOrder(false);
          return;
        }
      }

      await addDoc(collection(db, 'open_orders'), {
        customerName,
        customerId,
        type,
        status: 'open',
        items: [],
        totalAmount: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      setNewCustomerName('');
      setSelectedCustomerId('');
      setIsNewOrderOpen(false);
      toast.success('Comanda aberta com sucesso');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'open_orders');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const bootstrapAdmin = async () => {
    try {
      const adminUid = 'e5SB016rBhWuYEKifTIYSCfE5Bq2';
      await setDoc(doc(db, 'users', adminUid), {
        email: 'louisfelipecabral@gmail.com',
        displayName: 'Luis Felipe',
        role: 'admin',
        createdAt: serverTimestamp()
      });
      toast.success("Perfil de Administrador sincronizado!");
    } catch (error) {
      console.error("Erro ao sincronizar perfil:", error);
      toast.error("Erro ao sincronizar perfil. Verifique as permissões.");
    }
  };

  const filteredOrders = orders.filter(o => 
    (o.customerName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Quick Actions & Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20 shadow-lg shadow-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Ações Rápidas</p>
              <button 
                onClick={() => setIsNewOrderOpen(true)}
                className="text-sm font-black uppercase tracking-tighter hover:text-primary transition-colors"
              >
                Abrir Comanda
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Status do Sistema</p>
              <p className="text-sm font-black uppercase tracking-tighter">Data Hub Ativo</p>
            </div>
            {user.uid === 'e5SB016rBhWuYEKifTIYSCfE5Bq2' && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={bootstrapAdmin}
                className="text-primary/40 hover:text-primary transition-colors"
                title="Sincronizar Admin"
              >
                <ShieldCheck className="w-4 h-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Comandas Abertas</p>
              <p className="text-sm font-black uppercase tracking-tighter">{orders.length} Ativas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Vendas Hoje</p>
              <p className="text-sm font-black uppercase tracking-tighter">
                R$ {orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR MESA OU CLIENTE..." 
            className="pl-12 h-14 bg-card/50 border-border rounded-xl text-sm font-bold tracking-widest focus:ring-primary/20 focus:border-primary transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-card/50 p-1 rounded-xl border border-border">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode('grid')}
              className={cn("rounded-lg", viewMode === 'grid' && "bg-primary/10 text-primary")}
            >
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode('list')}
              className={cn("rounded-lg", viewMode === 'list' && "bg-primary/10 text-primary")}
            >
              <List className="w-5 h-5" />
            </Button>
          </div>

          <Dialog open={isNewOrderOpen} onOpenChange={(open) => {
            setIsNewOrderOpen(open);
            if (!open) {
              setNewCustomerName('');
              setSelectedCustomerId('');
              setNewOrderTab('table');
            }
          }}>
            <DialogTrigger
              nativeButton={true}
              render={
                <Button className="h-14 px-8 rounded-xl gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20">
                  <Plus className="w-5 h-5" />
                  Nova Comanda
                </Button>
              }
            />
            <DialogContent className="bg-[#0b1224] border-border max-w-lg text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-border/50 relative flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <UserPlus className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Nova Comanda</DialogTitle>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-primary/60 flex items-center gap-2">
                      <Zap className="w-3 h-3" /> Inicie o atendimento operacional
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsNewOrderOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex bg-[#111827]/50 p-1 rounded-xl border border-border">
                  <button 
                    onClick={() => setNewOrderTab('table')}
                    className={cn(
                      "flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                      newOrderTab === 'table' ? "bg-[#1f2937] text-white shadow-lg" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    Mesa
                  </button>
                  <button 
                    onClick={() => setNewOrderTab('fiel')}
                    className={cn(
                      "flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                      newOrderTab === 'fiel' ? "bg-[#1f2937] text-white shadow-lg" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    Fiel
                  </button>
                  <button 
                    onClick={() => setNewOrderTab('new')}
                    className={cn(
                      "flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                      newOrderTab === 'new' ? "bg-[#1f2937] text-white shadow-lg" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    + Cliente
                  </button>
                </div>

                {newOrderTab === 'table' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Identificação</label>
                      <Input 
                        placeholder="Ex: Mesa 05, Balcão..." 
                        className="h-16 bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-lg font-bold rounded-xl"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {newOrderTab === 'fiel' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Busca Rápida (A-Z)</label>
                      <div className="bg-[#111827]/50 p-4 rounded-xl border border-border">
                        <div className="grid grid-cols-9 gap-2">
                          {['TODOS', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map(letter => (
                            <button
                              key={letter}
                              onClick={() => setLetterFilter(letter)}
                              className={cn(
                                "aspect-square rounded-md text-[10px] font-black transition-all flex items-center justify-center",
                                letterFilter === letter ? "bg-[#0070f3] text-white shadow-[0_0_15px_rgba(0,112,243,0.5)]" : "text-muted-foreground hover:text-white"
                              )}
                            >
                              {letter === 'TODOS' ? 'TODOS' : letter}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Selecionar Cliente Fiel</label>
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger className={cn(
                          "h-16 bg-[#111827]/50 border-border text-lg font-bold rounded-xl transition-all",
                          selectedCustomerId && "border-[#0070f3] ring-1 ring-[#0070f3]/50"
                        )}>
                          <SelectValue placeholder="Selecione um cliente..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0b1224] border-border max-h-[300px] custom-scrollbar">
                          {customers
                            .filter(c => letterFilter === 'TODOS' || c.name.toUpperCase().startsWith(letterFilter))
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(customer => (
                              <SelectItem key={customer.id} value={customer.id} className="text-sm font-bold uppercase tracking-widest py-3">
                                {customer.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {newOrderTab === 'new' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Nome do Novo Cliente</label>
                      <Input 
                        placeholder="Nome completo" 
                        className="h-16 bg-[#111827]/50 border-border focus:ring-primary/20 focus:border-primary text-lg font-bold rounded-xl"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="p-8 border-t border-border/50 bg-[#0b1224] flex-row gap-4 flex-shrink-0">
                <Button variant="ghost" onClick={() => setIsNewOrderOpen(false)} disabled={isCreatingOrder} className="flex-1 h-14 font-black uppercase tracking-widest text-muted-foreground hover:text-white">Cancelar</Button>
                <Button 
                  onClick={handleCreateOrder} 
                  disabled={isCreatingOrder || (newOrderTab === 'fiel' ? !selectedCustomerId : !newCustomerName.trim())}
                  className="flex-1 h-14 font-black uppercase tracking-widest bg-[#0070f3] hover:bg-[#0070f3]/90 shadow-[0_0_20px_rgba(0,112,243,0.3)] rounded-xl"
                >
                  {isCreatingOrder ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Abrindo...</span>
                    </div>
                  ) : (
                    newOrderTab === 'new' ? 'Cadastrar e Abrir' : 'Abrir Comanda'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className={cn(
        "grid gap-4",
        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
      )}>
        {filteredOrders.map((order, idx) => (
          <OrderCard key={`${order.id}-${idx}`} order={order} products={products} customers={customers} categories={categories} viewMode={viewMode} />
        ))}
        {filteredOrders.length === 0 && (
          <div className="col-span-full py-24 text-center bg-card/30 rounded-2xl border border-dashed border-border">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-10" />
            <p className="text-muted-foreground font-bold tracking-widest uppercase">Nenhuma comanda ativa</p>
          </div>
        )}
      </div>
    </div>
  );
}

const OrderCard: React.FC<{ order: Order; products: Product[]; customers: Customer[]; categories: Category[]; viewMode: 'grid' | 'list' }> = ({ order, products, customers, categories, viewMode }) => {
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isRemoveItemConfirmOpen, setIsRemoveItemConfirmOpen] = useState(false);
  const [isLinkCustomerOpen, setIsLinkCustomerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [linkCustomerId, setLinkCustomerId] = useState('');
  const [linkLetterFilter, setLinkLetterFilter] = useState('TODOS');
  const [checkoutLetterFilter, setCheckoutLetterFilter] = useState('TODOS');
  const [isProcessing, setIsProcessing] = useState(false);

  // Checkout states
  const [checkoutAmount, setCheckoutAmount] = useState(order.totalAmount);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutAdjustment, setCheckoutAdjustment] = useState(0);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('DINHEIRO');
  const [checkoutDate, setCheckoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkoutCustomerId, setCheckoutCustomerId] = useState(order.customerId || 'none');

  useEffect(() => {
    if (isCheckoutOpen) {
      setCheckoutAmount(order.totalAmount - checkoutDiscount + checkoutAdjustment);
    }
  }, [order.totalAmount, checkoutDiscount, checkoutAdjustment, isCheckoutOpen]);

  useEffect(() => {
    if (isCheckoutOpen) {
      setCheckoutCustomerId(order.customerId || 'none');
      setCheckoutLetterFilter('TODOS');
    }
  }, [isCheckoutOpen, order.customerId]);

  const categoryIds = Array.from(new Set(products.map(p => p.categoryId || 'Outros')));
  const sortedCategories = categories
    .filter(c => categoryIds.includes(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Add "Outros" if there are products without a valid category
  if (products.some(p => !p.categoryId || !categories.find(c => c.id === p.categoryId))) {
    if (!sortedCategories.find(c => c.id === 'Outros')) {
      sortedCategories.push({ id: 'Outros', name: 'Outros' } as Category);
    }
  }

  const handleAddItem = async (product: Product) => {
    const existingItemIndex = order.items.findIndex(i => i.productId === product.id);
    let newItems = [...order.items];

    if (existingItemIndex > -1) {
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newItems[existingItemIndex].quantity + 1,
        subtotal: (newItems[existingItemIndex].quantity + 1) * product.price
      };
    } else {
      newItems.push({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price
      });
    }

    const newTotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: newItems,
        totalAmount: newTotal
      });
      toast.success(`Adicionado: ${product.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateQuantity = async (productId: string, delta: number) => {
    const itemIndex = order.items.findIndex(i => i.productId === productId);
    if (itemIndex === -1) return;

    let newItems = [...order.items];
    const newQuantity = newItems[itemIndex].quantity + delta;

    if (newQuantity <= 0) {
      newItems = newItems.filter(i => i.productId !== productId);
    } else {
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        quantity: newQuantity,
        subtotal: newQuantity * newItems[itemIndex].price
      };
    }

    const newTotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: newItems,
        totalAmount: newTotal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkCustomer = async () => {
    if (!linkCustomerId) return;
    const customer = customers.find(c => c.id === linkCustomerId);
    if (!customer) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        customerId: customer.id,
        customerName: customer.name,
        type: 'customer'
      });
      setIsLinkCustomerOpen(false);
      setLinkCustomerId('');
      toast.success('Cliente vinculado com sucesso');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeCheckout = async () => {
    setIsProcessing(true);
    try {
      const finalAmount = checkoutAmount;
      const targetCustomerId = checkoutCustomerId || order.customerId;

      // 1. Close the order
      await updateDoc(doc(db, 'open_orders', order.id), {
        status: 'closed',
        closedAt: serverTimestamp(),
        totalAmount: finalAmount,
        customerId: targetCustomerId === 'none' ? '' : targetCustomerId
      });
      
      // 2. Update customer stats if linked
      if (targetCustomerId && targetCustomerId !== 'none') {
        const customerRef = doc(db, 'customers', targetCustomerId);
        const customer = customers.find(c => c.id === targetCustomerId);
        if (customer) {
          await updateDoc(customerRef, {
            totalSpent: (customer.totalSpent || 0) + finalAmount,
            orderCount: (customer.orderCount || 0) + 1,
            lastVisit: serverTimestamp()
          });
        }
      }

      // 3. Create financial transaction
      await addDoc(collection(db, 'transactions'), {
        type: 'income',
        category: 'Vendas',
        amount: finalAmount,
        description: `Comanda fechada: ${order.customerName}${checkoutDiscount > 0 ? ` (Desc: R$ ${checkoutDiscount})` : ''}${checkoutAdjustment !== 0 ? ` (Ajuste: R$ ${checkoutAdjustment})` : ''}`,
        date: new Date(checkoutDate + 'T12:00:00'), // Use specified date
        orderId: order.id,
        paymentMethod: checkoutPaymentMethod
      });

      setIsCheckoutOpen(false);
      setIsAddItemsOpen(false);
      toast.success('Recebimento finalizado com sucesso');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteOrder = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'open_orders', order.id));
      toast.success('Comanda excluída com sucesso');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `open_orders/${order.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearItems = async () => {
    if (order.items.length === 0) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: [],
        totalAmount: 0
      });
      toast.success('Comanda limpa');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveItem = async () => {
    if (!itemToRemove) return;
    const newItems = order.items.filter(i => i.productId !== itemToRemove);
    const newTotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: newItems,
        totalAmount: newTotal
      });
      toast.success('Item removido');
      setItemToRemove(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {viewMode === 'list' ? (
        <div className="group relative bg-card hover:bg-card/80 border border-border rounded-xl p-4 md:p-6 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse" />
              <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-ping" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h3 className="font-bold text-base md:text-lg uppercase tracking-wider truncate">{order.customerName}</h3>
                <div className="flex gap-1 flex-shrink-0">
                  {order.type === 'table' ? (
                    <Badge variant="outline" className="text-[7px] md:text-[8px] font-bold tracking-widest uppercase border-primary/20 bg-primary/5 text-primary">
                      Mesa
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[7px] md:text-[8px] font-bold tracking-widest uppercase border-green-500/20 bg-green-500/5 text-green-500">
                      Fiel
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[7px] md:text-[8px] font-bold tracking-widest uppercase border-border bg-white/5">
                    <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" /> {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'HH:mm') : 'Agora'}
                  </Badge>
                </div>
              </div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground font-bold tracking-widest uppercase truncate">
                {order.items.reduce((sum, i) => sum + i.quantity, 0)} ITENS • {order.items.length} PRODUTOS
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
            <div className="text-left sm:text-right">
              <p className="text-xl md:text-2xl font-black tracking-tight">
                <span className="text-[10px] md:text-xs font-bold text-muted-foreground mr-1">R$</span>
                {(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Excluir Comanda"
                title="Excluir Comanda"
                disabled={isProcessing}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all h-9 w-9 md:h-10 md:w-10"
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              </Button>

              <Dialog open={isAddItemsOpen} onOpenChange={setIsAddItemsOpen}>
                <DialogTrigger
                  render={
                    <button 
                      aria-label="Ver detalhes e adicionar itens"
                      className="p-2 md:p-2.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
                    >
                      <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  }
                />
                <DialogContent className="max-w-6xl bg-[#0b1224] border-border text-white p-0 overflow-hidden h-[95vh] md:h-[90vh] flex flex-col">
                  {/* Header */}
                  <div className="p-4 md:p-8 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between bg-[#0b1224] z-10 gap-4 flex-shrink-0 relative">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[#111827] flex items-center justify-center border border-[#1e293b] shadow-lg">
                        <Receipt className="w-5 h-5 md:w-7 md:h-7 text-[#0070f3]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <DialogTitle className="text-xl md:text-5xl font-black uppercase tracking-tighter leading-none truncate max-w-[180px] md:max-w-none">{order.customerName}</DialogTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase border-border bg-[#111827] text-muted-foreground px-2 md:px-3 py-0.5 md:py-1">
                            {order.type === 'table' ? 'AVULSO' : 'FIEL'}
                          </Badge>
                          {order.type === 'table' && (
                            <Dialog open={isLinkCustomerOpen} onOpenChange={setIsLinkCustomerOpen}>
                              <DialogTrigger
                                render={
                                  <button className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase text-[#0070f3] hover:underline">VINCULAR</button>
                                }
                              />
                              <DialogContent className="bg-[#0b1224] border-border max-w-md text-white p-0 overflow-hidden flex flex-col max-h-[80vh]">
                                <DialogHeader className="p-6 border-b border-border/50">
                                  <DialogTitle className="text-xl font-black uppercase tracking-tighter">Vincular Cliente Fiel</DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                  <div className="space-y-3">
                                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Busca Rápida (A-Z)</label>
                                    <div className="bg-[#111827]/50 p-4 rounded-xl border border-border">
                                      <div className="grid grid-cols-7 gap-1">
                                        {['TODOS', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map(letter => (
                                          <button
                                            key={letter}
                                            onClick={() => setLinkLetterFilter(letter)}
                                            className={cn(
                                              "aspect-square rounded-md text-[10px] font-black transition-all flex items-center justify-center",
                                              linkLetterFilter === letter ? "bg-[#0070f3] text-white shadow-[0_0_15px_rgba(0,112,243,0.5)]" : "text-muted-foreground hover:text-white"
                                            )}
                                          >
                                            {letter === 'TODOS' ? 'TODOS' : letter}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Selecionar Cliente</label>
                                    <Select value={linkCustomerId} onValueChange={setLinkCustomerId}>
                                      <SelectTrigger className={cn(
                                        "h-14 bg-[#111827]/50 border-border text-sm font-bold rounded-xl transition-all",
                                        linkCustomerId && "border-[#0070f3] ring-1 ring-[#0070f3]/50"
                                      )}>
                                        <SelectValue placeholder="Selecione um cliente..." />
                                      </SelectTrigger>
                                      <SelectContent className="bg-[#0b1224] border-border max-h-[200px] custom-scrollbar">
                                        {customers
                                          .filter(c => linkLetterFilter === 'TODOS' || c.name.toUpperCase().startsWith(linkLetterFilter))
                                          .sort((a, b) => a.name.localeCompare(b.name))
                                          .map(customer => (
                                            <SelectItem key={customer.id} value={customer.id} className="text-sm font-bold uppercase tracking-widest py-3">
                                              {customer.name}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter className="p-6 border-t border-border/50 bg-[#0b1224] flex-row gap-3">
                                  <Button variant="ghost" onClick={() => setIsLinkCustomerOpen(false)} disabled={isProcessing} className="flex-1 h-12 font-black uppercase tracking-widest text-xs">Cancelar</Button>
                                  <Button 
                                    onClick={handleLinkCustomer} 
                                    disabled={!linkCustomerId || isProcessing}
                                    className="flex-1 h-12 font-black uppercase tracking-widest text-xs bg-[#0070f3] hover:bg-[#0070f3]/90"
                                  >
                                    {isProcessing ? (
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Vinculando...</span>
                                      </div>
                                    ) : (
                                      'Vincular'
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">TOTAL ACUMULADO</p>
                      <p className="text-4xl md:text-6xl font-black text-[#0070f3] tracking-tighter leading-none">R$ {(order.totalAmount || 0).toFixed(2)}</p>
                    </div>
                    
                    <button 
                      onClick={() => setIsAddItemsOpen(false)} 
                      aria-label="Fechar"
                      className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Left Side: Products */}
                    <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border/50 min-h-0">
                      <div className="p-4 md:p-6 flex-shrink-0">
                        <div className="flex gap-3">
                          <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                              placeholder="Buscar item..." 
                              className="pl-10 md:pl-12 h-12 md:h-14 bg-[#111827]/50 border-border rounded-xl text-xs md:text-sm font-bold tracking-widest focus:ring-primary/20 focus:border-primary transition-all"
                              value={itemSearch}
                              onChange={(e) => setItemSearch(e.target.value)}
                            />
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#111827]/50 border-border hover:bg-orange-500/10 hover:border-orange-500/50 group transition-all flex-shrink-0"
                          >
                            <Zap className="w-5 h-5 md:w-6 md:h-6 text-orange-500 group-hover:scale-110 transition-transform" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 px-4 md:px-6 pb-4 md:pb-6 overflow-y-auto min-h-0 custom-scrollbar">
                        <div className="space-y-4">
                          {sortedCategories.map(category => {
                            const categoryProducts = products.filter(p => 
                              (p.categoryId === category.id || (category.id === 'Outros' && (!p.categoryId || !categories.find(c => c.id === p.categoryId)))) && 
                              p.active !== false && 
                              p.name.toLowerCase().includes(itemSearch.toLowerCase())
                            );
                            if (categoryProducts.length === 0) return null;

                            const isExpanded = expandedCategories.includes(category.id);

                            return (
                              <div key={category.id} className="bg-[#111827]/30 border border-border/50 rounded-2xl overflow-hidden transition-all hover:border-[#0070f3]/30">
                                <button 
                                  onClick={() => setExpandedCategories(prev => isExpanded ? prev.filter(c => c !== category.id) : [...prev, category.id])}
                                  className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#111827] flex items-center justify-center border border-[#1e293b]">
                                      <Package className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                                    </div>
                                    <div className="text-left">
                                      <h4 className="font-black uppercase tracking-tighter text-lg md:text-xl">{category.name}</h4>
                                      <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{categoryProducts.length} ITENS</p>
                                    </div>
                                  </div>
                                  <ChevronRight className={cn("w-4 h-4 md:w-5 md:h-5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                                </button>

                                {isExpanded && (
                                  <div className="px-4 md:px-6 pb-4 md:pb-6 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {categoryProducts.map(product => (
                                      <button
                                        key={product.id}
                                        onClick={() => handleAddItem(product)}
                                        className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-[#111827]/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                      >
                                        <div className="text-left">
                                          <p className="font-bold uppercase tracking-wider text-xs md:text-sm">{product.name}</p>
                                          <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">R$ {product.price.toFixed(2)}</p>
                                        </div>
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-all">
                                          <Plus className="w-3 h-3 md:w-4 md:h-4" />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Cart */}
                    <div className="w-full lg:w-[400px] flex flex-col bg-[#0b1224] border-t lg:border-t-0 border-border/50 max-h-[40vh] lg:max-h-none">
                      <div className="p-4 md:p-6 border-b border-border/50 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                          <h4 className="font-black uppercase tracking-widest text-xs">SACOLA ({order.items.reduce((sum, i) => sum + i.quantity, 0)})</h4>
                        </div>
                        <button 
                          onClick={() => setIsClearConfirmOpen(true)}
                          aria-label="Limpar sacola"
                          disabled={isProcessing}
                          className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>

                      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 custom-scrollbar">
                        <div className="space-y-3 md:space-y-4">
                          {order.items.map((item, idx) => (
                            <div key={`${order.id}-cart-item-${item.productId}-${idx}`} className="p-4 md:p-5 rounded-2xl bg-[#111827]/50 border border-border/50 relative group">
                              <div className="flex justify-between items-start mb-3 md:mb-4">
                                <div className="min-w-0">
                                  <h5 className="font-black uppercase tracking-widest text-xs md:text-sm mb-1 truncate">{item.productName}</h5>
                                  <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">R$ {item.price.toFixed(2)}</p>
                                </div>
                                <button 
                                  onClick={() => {
                                    setItemToRemove(item.productId);
                                    setIsRemoveItemConfirmOpen(true);
                                  }}
                                  aria-label="Remover item"
                                  disabled={isProcessing}
                                  className="text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center bg-[#0b1224] rounded-xl border border-border p-1">
                                  <button 
                                    onClick={() => handleUpdateQuantity(item.productId, -1)}
                                    aria-label="Diminuir quantidade"
                                    disabled={isProcessing}
                                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors disabled:opacity-50"
                                  >
                                    <div className="w-2.5 h-0.5 bg-muted-foreground" />
                                  </button>
                                  <span className="w-8 md:w-10 text-center font-black text-xs md:text-sm">{item.quantity}</span>
                                  <button 
                                    onClick={() => handleUpdateQuantity(item.productId, 1)}
                                    aria-label="Aumentar quantidade"
                                    disabled={isProcessing}
                                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors disabled:opacity-50"
                                  >
                                    <Plus className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                  </button>
                                </div>
                                <p className="font-black text-base md:text-lg tracking-tighter">R$ {(item.subtotal || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                          {order.items.length === 0 && (
                            <div className="py-10 md:py-20 text-center">
                              <ShoppingCart className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-4 opacity-10" />
                              <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Sacola vazia</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-6 md:p-8 border-t border-border/50 bg-[#0b1224]/50 flex-shrink-0">
                        <div className="flex items-center justify-between mb-6 md:mb-8">
                          <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-muted-foreground">TOTAL</p>
                          <p className="text-3xl md:text-4xl font-black text-[#0070f3] tracking-tighter">R$ {(order.totalAmount || 0).toFixed(2)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                          <Button 
                            variant="outline" 
                            className="h-12 md:h-16 border-border bg-[#111827]/50 hover:bg-white/5 font-black uppercase tracking-widest text-[10px] md:text-xs rounded-2xl gap-2 border-white/5"
                            onClick={() => setIsCheckoutOpen(true)}
                          >
                            <span className="text-green-500 font-black">$</span> RECEBER
                          </Button>
                          <Button 
                            className="h-12 md:h-16 bg-[#00a878] hover:bg-[#00a878]/90 font-black uppercase tracking-widest text-[10px] md:text-xs rounded-2xl shadow-[0_0_20px_rgba(0,168,120,0.2)]"
                            onClick={() => setIsAddItemsOpen(false)}
                          >
                            SALVAR
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden border-border bg-card hover:bg-card/80 transition-all cursor-pointer group">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">{order.customerName}</CardTitle>
                  {order.type === 'customer' && (
                    <Badge variant="outline" className="text-[8px] font-bold tracking-widest uppercase border-green-500/20 bg-green-500/5 text-green-500">
                      Fiel
                    </Badge>
                  )}
                </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground font-bold">
                  {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'HH:mm') : 'Agora'}
                </p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label="Excluir Comanda"
                  title="Excluir Comanda"
                  disabled={isProcessing}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteConfirmOpen(true);
                  }}
                  className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-1">Total</p>
                <p className="text-2xl font-black tracking-tight">
                  <span className="text-xs font-bold text-muted-foreground mr-1">R$</span>
                  {(order.totalAmount || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-1">Itens</p>
                <p className="text-lg font-bold">{order.items.reduce((sum, i) => sum + i.quantity, 0)}</p>
              </div>
            </div>
            
            <Button 
              className="w-full h-12 rounded-xl font-bold uppercase tracking-widest"
              onClick={() => setIsAddItemsOpen(true)}
            >
              Ver Detalhes
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Excluir Comanda"
        description={`Deseja realmente excluir a comanda de ${order.customerName}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteOrder}
        variant="destructive"
        confirmText="Excluir"
      />

      <ConfirmDialog 
        isOpen={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        title="Limpar Comanda"
        description="Deseja realmente remover todos os itens desta comanda?"
        onConfirm={handleClearItems}
        variant="destructive"
        confirmText="Limpar"
      />

      <ConfirmDialog 
        isOpen={isRemoveItemConfirmOpen}
        onOpenChange={setIsRemoveItemConfirmOpen}
        title="Remover Item"
        description="Deseja realmente remover este item da comanda?"
        onConfirm={handleRemoveItem}
        variant="destructive"
        confirmText="Remover"
      />

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-[#0b1224] border-border max-w-lg text-white p-0 overflow-hidden flex flex-col max-h-[95vh]">
          <div className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7 text-green-500" />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none mb-1">{order.customerName}</DialogTitle>
                <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-green-500/60 flex items-center gap-2">
                  <Receipt className="w-3 h-3" /> Checkout & Conciliação: R$ {order.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="bg-[#111827]/50 p-6 rounded-2xl border border-dashed border-green-500/30 text-center space-y-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Valor a Receber</p>
              <p className="text-4xl md:text-6xl font-black text-[#0070f3] tracking-tighter leading-none">R$ {checkoutAmount.toFixed(2)}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" /> Valor a Pagar Agora
                </label>
                <Input 
                  type="number" 
                  step="0.01"
                  className="h-14 bg-[#111827]/50 border-border text-2xl font-black text-center focus:ring-[#0070f3]/20 focus:border-[#0070f3]"
                  value={checkoutAmount}
                  onChange={(e) => setCheckoutAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1 flex items-center gap-2">
                    <TrendingDown className="w-3 h-3" /> Desconto
                  </label>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="h-12 bg-[#111827]/50 border-border font-bold"
                    value={checkoutDiscount}
                    onChange={(e) => setCheckoutDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1 flex items-center gap-2">
                    <Plus className="w-3 h-3" /> Ajuste
                  </label>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="h-12 bg-[#111827]/50 border-border font-bold"
                    value={checkoutAdjustment}
                    onChange={(e) => setCheckoutAdjustment(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Data do Atendimento
                </label>
                <Input 
                  type="date"
                  className="h-12 bg-[#111827]/50 border-border font-bold"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Vincular Cliente Fiel</label>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Busca Rápida (A-Z)</label>
                  <div className="bg-[#111827]/50 p-4 rounded-xl border border-border">
                    <div className="grid grid-cols-7 gap-1">
                      {['TODOS', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map(letter => (
                        <button
                          key={letter}
                          onClick={() => setCheckoutLetterFilter(letter)}
                          className={cn(
                            "aspect-square rounded-md text-[10px] font-black transition-all flex items-center justify-center",
                            checkoutLetterFilter === letter ? "bg-[#0070f3] text-white shadow-[0_0_15px_rgba(0,112,243,0.5)]" : "text-muted-foreground hover:text-white"
                          )}
                        >
                          {letter === 'TODOS' ? 'TODOS' : letter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Select value={checkoutCustomerId} onValueChange={setCheckoutCustomerId}>
                  <SelectTrigger className="h-12 bg-[#111827]/50 border-border font-bold uppercase tracking-widest text-[10px]">
                    <SelectValue placeholder="-- SEM VÍNCULO --" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1224] border-border max-h-[200px] custom-scrollbar">
                    <SelectItem value="none" className="uppercase font-bold tracking-widest text-xs">-- SEM VÍNCULO --</SelectItem>
                    {[...customers]
                      .filter(c => checkoutLetterFilter === 'TODOS' || c.name.toUpperCase().startsWith(checkoutLetterFilter))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(c => (
                        <SelectItem key={c.id} value={c.id} className="uppercase font-bold tracking-widest text-xs">{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Forma de Pagamento</label>
                <Select value={checkoutPaymentMethod} onValueChange={setCheckoutPaymentMethod}>
                  <SelectTrigger className="h-12 bg-[#111827]/50 border-border font-bold uppercase tracking-widest text-[10px]">
                    <SelectValue placeholder="DINHEIRO" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1224] border-border">
                    <SelectItem value="DINHEIRO" className="uppercase font-bold tracking-widest text-xs">DINHEIRO</SelectItem>
                    <SelectItem value="PIX" className="uppercase font-bold tracking-widest text-xs">PIX</SelectItem>
                    <SelectItem value="CARTÃO DÉBITO" className="uppercase font-bold tracking-widest text-xs">CARTÃO DÉBITO</SelectItem>
                    <SelectItem value="CARTÃO CRÉDITO" className="uppercase font-bold tracking-widest text-xs">CARTÃO CRÉDITO</SelectItem>
                    <SelectItem value="PENDURA" className="uppercase font-bold tracking-widest text-xs">PENDURA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 md:p-8 border-t border-border/50 bg-[#0b1224] flex-row gap-4 flex-shrink-0">
            <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)} disabled={isProcessing} className="flex-1 h-12 font-black uppercase tracking-widest text-xs">Cancelar</Button>
            <Button 
              onClick={handleFinalizeCheckout} 
              disabled={isProcessing}
              className="flex-1 h-12 font-black uppercase tracking-widest text-xs bg-[#22c55e] hover:bg-[#16a34a] shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Finalizando...</span>
                </div>
              ) : (
                'Finalizar Recebimento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

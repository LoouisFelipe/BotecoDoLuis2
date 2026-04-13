import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, updateDoc, doc, orderBy, deleteDoc, setDoc } from 'firebase/firestore';
import { Order, Product, UserProfile, Customer, Category } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Plus, Search, ShoppingCart, CheckCircle2, ChevronRight, LayoutGrid, List, Zap, Activity, Clock, TrendingUp, TrendingDown, Trash2, ShieldCheck, UserPlus, Menu, X, Receipt, Package, Calendar, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';
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

  useEffect(() => {
    const q = query(
      collection(db, 'open_orders'), 
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'open_orders'));

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category)));
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
      <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4">
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

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-[#0070f3] transition-colors" />
          <Input 
            placeholder="PESQUISAR MESA OU CLIENTE..." 
            className="pl-12 h-16 bg-[#0d1117] border-white/5 rounded-2xl text-sm font-bold tracking-widest focus:ring-[#0070f3]/20 focus:border-[#0070f3] transition-all uppercase"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Dialog open={isNewOrderOpen} onOpenChange={(open) => {
            setIsNewOrderOpen(open);
            if (!open) {
              setNewCustomerName('');
              setSelectedCustomerId('');
              setNewOrderTab('table');
            }
          }}>
            <DialogTrigger render={
              <Button className="h-16 px-8 bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[#0070f3]/20 gap-2 hidden md:flex">
                <Plus className="w-5 h-5" />
                ABRIR COMANDA
              </Button>
            } />
            {/* FAB for Mobile */}
            <DialogTrigger render={
              <button className="md:hidden fixed bottom-24 right-6 w-16 h-16 bg-[#0070f3] text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-transform">
                <Plus className="w-8 h-8" />
              </button>
            } />
            <DialogContent className="bg-[#05070a] border-none max-w-2xl text-white p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
              <div className="p-8 border-b border-white/5 relative flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0070f3]/10 flex items-center justify-center border border-[#0070f3]/20">
                    <UserPlus className="w-7 h-7 text-[#0070f3]" />
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Nova Comanda</DialogTitle>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[#0070f3]/60 flex items-center gap-2">
                      <Zap className="w-3 h-3" /> Inicie o atendimento operacional
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsNewOrderOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex px-8 py-4 bg-[#05070a] border-b border-white/5 gap-8">
                <button 
                  onClick={() => setNewOrderTab('table')}
                  className={cn(
                    "flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative",
                    newOrderTab === 'table' ? "bg-[#161b22] text-[#0070f3]" : "text-muted-foreground hover:text-white"
                  )}
                >
                  MESA
                  {newOrderTab === 'table' && (
                    <motion.div layoutId="newOrderTab" className="absolute -bottom-4 left-0 right-0 h-1 bg-[#0070f3] rounded-full" />
                  )}
                </button>
                <button 
                  onClick={() => setNewOrderTab('fiel')}
                  className={cn(
                    "flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative",
                    newOrderTab === 'fiel' ? "bg-[#161b22] text-[#0070f3]" : "text-muted-foreground hover:text-white"
                  )}
                >
                  FIEL
                  {newOrderTab === 'fiel' && (
                    <motion.div layoutId="newOrderTab" className="absolute -bottom-4 left-0 right-0 h-1 bg-[#0070f3] rounded-full" />
                  )}
                </button>
                <button 
                  onClick={() => setNewOrderTab('new')}
                  className={cn(
                    "flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative",
                    newOrderTab === 'new' ? "bg-[#161b22] text-[#0070f3]" : "text-muted-foreground hover:text-white"
                  )}
                >
                  + CLIENTE
                  {newOrderTab === 'new' && (
                    <motion.div layoutId="newOrderTab" className="absolute -bottom-4 left-0 right-0 h-1 bg-[#0070f3] rounded-full" />
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {newOrderTab === 'table' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Identificação</label>
                      <Input 
                        placeholder="Ex: Mesa 05, Balcão..." 
                        className="h-16 bg-[#0d1117] border-white/5 focus:ring-[#0070f3]/20 focus:border-[#0070f3] text-lg font-bold rounded-xl uppercase"
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
                      <div className="bg-[#0d1117] p-4 rounded-xl border border-white/5">
                        <div className="grid grid-cols-7 gap-1">
                          {['TODOS', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map(letter => (
                            <button
                              key={letter}
                              onClick={() => setLetterFilter(letter)}
                              className={cn(
                                "aspect-square rounded-md text-[10px] font-black transition-all flex items-center justify-center min-w-[32px] min-h-[32px]",
                                letterFilter === letter ? "bg-[#0070f3] text-white shadow-[0_0_15px_rgba(0,112,243,0.5)]" : "text-muted-foreground hover:text-white"
                              )}
                            >
                              {letter === 'TODOS' ? 'T' : letter}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Selecionar Cliente Fiel</label>
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger className={cn(
                          "h-16 bg-[#0d1117] border-white/5 text-lg font-bold rounded-xl transition-all",
                          selectedCustomerId && "border-[#0070f3] ring-1 ring-[#0070f3]/50"
                        )}>
                          <SelectValue placeholder="Selecione um cliente..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#05070a] border-white/5 max-h-[300px] custom-scrollbar">
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
                        className="h-16 bg-[#0d1117] border-white/5 focus:ring-[#0070f3]/20 focus:border-[#0070f3] text-lg font-bold rounded-xl"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="p-8 border-t border-white/5 bg-[#05070a] flex-row gap-4 flex-shrink-0">
                <Button variant="ghost" onClick={() => setIsNewOrderOpen(false)} disabled={isCreatingOrder} className="flex-1 h-14 font-black uppercase tracking-widest text-muted-foreground hover:text-white">Cancelar</Button>
                <Button 
                  onClick={handleCreateOrder} 
                  disabled={isCreatingOrder || (newOrderTab === 'fiel' ? !selectedCustomerId : !newCustomerName.trim())}
                  className="flex-1 h-14 font-black uppercase tracking-widest bg-[#0070f3] hover:bg-[#0070f3]/90 shadow-[0_0_20px_rgba(0,112,243,0.3)] rounded-xl"
                >
                  {isCreatingOrder ? 'Abrindo...' : 'Abrir Comanda'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex bg-[#0d1117] p-1.5 rounded-2xl border border-white/5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode('grid')}
              className={cn("rounded-xl w-12 h-12", viewMode === 'grid' ? "bg-[#0070f3]/10 text-[#0070f3]" : "text-muted-foreground")}
            >
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode('list')}
              className={cn("rounded-xl w-12 h-12", viewMode === 'list' ? "bg-[#0070f3]/10 text-[#0070f3]" : "text-muted-foreground")}
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className={cn(
        "grid gap-3",
        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
      )}>
        {filteredOrders.map((order) => (
          <OrderCard key={order.id} order={order} products={products} customers={customers} categories={categories} viewMode={viewMode} />
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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
  const [detailTab, setDetailTab] = useState<'menu' | 'cart'>('menu');

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

      await updateDoc(doc(db, 'open_orders', order.id), {
        status: 'closed',
        closedAt: serverTimestamp(),
        totalAmount: finalAmount,
        customerId: targetCustomerId === 'none' ? '' : targetCustomerId
      });
      
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

      await addDoc(collection(db, 'transactions'), {
        type: 'income',
        category: 'Vendas',
        amount: finalAmount,
        description: `Comanda fechada: ${order.customerName}${checkoutDiscount > 0 ? ` (Desc: R$ ${checkoutDiscount})` : ''}${checkoutAdjustment !== 0 ? ` (Ajuste: R$ ${checkoutAdjustment})` : ''}`,
        date: new Date(checkoutDate + 'T12:00:00'),
        orderId: order.id,
        paymentMethod: checkoutPaymentMethod
      });

      setIsCheckoutOpen(false);
      setIsDetailOpen(false);
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
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogTrigger render={viewMode === 'list' ? (
            <div className="group relative bg-[#0d1117] hover:bg-[#161b22] border border-white/5 rounded-2xl p-5 md:p-6 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-lg md:text-xl uppercase tracking-tight truncate leading-none mb-1">{order.customerName}</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-bold tracking-widest uppercase">
                    {order.items.reduce((sum, i) => sum + i.quantity, 0)} ITENS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg md:text-2xl font-black tracking-tighter">
                    <span className="text-[10px] md:text-xs font-bold text-muted-foreground mr-1">R$</span>
                    {(order.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </div>
            </div>
          ) : (
            <Card className="overflow-hidden border-white/5 bg-[#0d1117] hover:bg-[#161b22] transition-all cursor-pointer group shadow-lg">
              <CardHeader className="border-b border-white/5 pb-4 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <CardTitle className="text-lg font-black uppercase tracking-tight truncate max-w-[150px]">{order.customerName}</CardTitle>
                    {order.type === 'customer' && (
                      <Badge variant="outline" className="text-[8px] font-black tracking-widest uppercase border-[#0070f3]/20 bg-[#0070f3]/5 text-[#0070f3]">
                        Fiel
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground font-black">
                      {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'HH:mm') : 'AGORA'}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase mb-1">Total</p>
                    <p className="text-3xl font-black tracking-tighter">
                      <span className="text-xs font-bold text-muted-foreground mr-1">R$</span>
                      {(order.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase mb-1">Itens</p>
                    <p className="text-xl font-black">{order.items.reduce((sum, i) => sum + i.quantity, 0)}</p>
                  </div>
                </div>
                
                <Button 
                  className="w-full h-14 bg-[#0070f3] hover:bg-[#0070f3]/90 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#0070f3]/20"
                  onClick={() => setIsDetailOpen(true)}
                >
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          )} />
        <DialogContent className="max-w-7xl bg-[#05070a] border-none text-white p-0 overflow-hidden h-screen md:h-[90vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between bg-[#05070a] z-20 gap-4 flex-shrink-0 relative">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[#0d1117] flex items-center justify-center border border-white/5 shadow-lg">
                <Receipt className="w-6 h-6 md:w-8 md:h-8 text-[#0070f3]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <DialogTitle className="text-2xl md:text-5xl font-black uppercase tracking-tighter leading-none truncate max-w-[200px] md:max-w-none">
                    {order.customerName}
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] md:text-xs font-black tracking-widest uppercase text-muted-foreground">
                    {order.type === 'table' ? 'AVULSO' : 'FIEL'}
                  </span>
                  {order.type === 'table' && (
                    <button 
                      className="text-[10px] md:text-xs font-black tracking-widest uppercase text-[#0070f3] hover:text-[#0070f3]/80 transition-colors"
                      onClick={() => setIsLinkCustomerOpen(true)}
                    >
                      VINCULAR FIEL
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">TOTAL ACUMULADO</p>
              <p className="text-3xl md:text-5xl font-black tracking-tighter text-[#0070f3]">
                <span className="text-sm md:text-xl mr-1">R$</span>
                {(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>

            <button 
              onClick={() => setIsDetailOpen(false)} 
              className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-6 md:px-8 py-4 bg-[#05070a] border-b border-white/5 gap-8">
            <button 
              onClick={() => setDetailTab('menu')}
              className={cn(
                "flex items-center gap-2 py-2 text-xs font-black uppercase tracking-widest transition-all relative",
                detailTab === 'menu' ? "text-[#0070f3]" : "text-muted-foreground hover:text-white"
              )}
            >
              <Menu className="w-4 h-4" />
              CARDÁPIO
              {detailTab === 'menu' && (
                <motion.div layoutId="detailTab" className="absolute -bottom-4 left-0 right-0 h-1 bg-[#0070f3] rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setDetailTab('cart')}
              className={cn(
                "flex items-center gap-2 py-2 text-xs font-black uppercase tracking-widest transition-all relative",
                detailTab === 'cart' ? "text-[#0070f3]" : "text-muted-foreground hover:text-white"
              )}
            >
              <ShoppingCart className="w-4 h-4" />
              SACOLA
              <span className="bg-[#0070f3] text-white text-[10px] px-2 py-0.5 rounded-full ml-1">
                {order.items.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
              {detailTab === 'cart' && (
                <motion.div layoutId="detailTab" className="absolute -bottom-4 left-0 right-0 h-1 bg-[#0070f3] rounded-full" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col bg-[#05070a]">
            <AnimatePresence mode="wait">
              {detailTab === 'menu' ? (
                <motion.div 
                  key="menu"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 flex flex-col p-6 md:p-8 space-y-6 overflow-hidden"
                >
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-[#0070f3] transition-colors" />
                    <Input 
                      placeholder="Buscar item..." 
                      className="pl-12 h-16 bg-[#0d1117] border-white/5 rounded-2xl text-sm font-bold tracking-widest focus:ring-[#0070f3]/20 focus:border-[#0070f3] transition-all uppercase"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {sortedCategories.map(category => (
                      <div key={category.id} className="bg-[#0d1117] border border-white/5 rounded-2xl overflow-hidden">
                        <button 
                          onClick={() => {
                            setExpandedCategories(prev => 
                              prev.includes(category.id) ? prev.filter(id => id !== category.id) : [...prev, category.id]
                            );
                          }}
                          className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground">
                              <Package className="w-5 h-5" />
                            </div>
                            <span className="font-black text-sm uppercase tracking-widest">{category.name}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {products.filter(p => (p.categoryId || 'Outros') === category.id).length} ITENS
                            </span>
                          </div>
                          <ChevronRight className={cn("w-5 h-5 text-muted-foreground transition-transform", expandedCategories.includes(category.id) && "rotate-90")} />
                        </button>
                        
                        <AnimatePresence>
                          {expandedCategories.includes(category.id) && (
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden border-t border-white/5"
                            >
                              <div className="p-2 space-y-1">
                                {products
                                  .filter(p => (p.categoryId || 'Outros') === category.id)
                                  .filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()))
                                  .map(product => (
                                    <button
                                      key={product.id}
                                      onClick={() => handleAddItem(product)}
                                      className="w-full p-4 flex items-center justify-between rounded-xl hover:bg-white/5 transition-all text-left group"
                                    >
                                      <div>
                                        <p className="font-bold text-sm uppercase tracking-wider group-hover:text-[#0070f3] transition-colors">{product.name}</p>
                                        <p className="text-xs text-muted-foreground font-bold tracking-widest">R$ {product.price.toFixed(2)}</p>
                                      </div>
                                      <Plus className="w-5 h-5 text-muted-foreground group-hover:text-[#0070f3] transition-all" />
                                    </button>
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="cart"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col p-6 md:p-8 space-y-6 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">SACOLA ({order.items.length})</h4>
                    <button 
                      onClick={() => setIsClearConfirmOpen(true)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {order.items.map(item => (
                      <div key={item.productId} className="bg-[#0d1117] border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-black text-sm md:text-lg uppercase tracking-tight truncate leading-none mb-1">{item.productName}</p>
                          <p className="text-xs text-muted-foreground font-bold tracking-widest">R$ {item.price.toFixed(2)}</p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center bg-[#161b22] rounded-xl p-1 border border-white/5">
                            <button 
                              onClick={() => handleUpdateQuantity(item.productId, -1)}
                              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-black text-lg">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(item.productId, 1)}
                              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button 
                            onClick={() => {
                              setItemToRemove(item.productId);
                              setIsRemoveItemConfirmOpen(true);
                            }}
                            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {order.items.length === 0 && (
                      <div className="py-24 text-center">
                        <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                        <p className="text-muted-foreground font-bold tracking-widest uppercase">Sacola vazia</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-6 md:p-8 border-t border-white/5 bg-[#0d1117] flex flex-col space-y-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">TOTAL ACUMULADO</p>
              <p className="text-3xl font-black tracking-tighter text-[#0070f3]">
                <span className="text-sm mr-1">R$</span>
                {(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-4">
              <Button 
                onClick={() => setIsCheckoutOpen(true)}
                className="flex-1 h-16 bg-[#161b22] hover:bg-[#1f2937] text-green-500 font-black uppercase tracking-widest rounded-2xl border border-green-500/20 gap-2"
              >
                <Receipt className="w-5 h-5" />
                RECEBER
              </Button>
              <Button 
                onClick={() => setIsDetailOpen(false)}
                className="flex-1 h-16 bg-[#28a745] hover:bg-[#218838] text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-green-500/20"
              >
                SALVAR COMANDA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Customer Modal */}
      <Dialog open={isLinkCustomerOpen} onOpenChange={setIsLinkCustomerOpen}>
        <DialogContent className="bg-[#05070a] border-none max-w-lg text-white p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
          <div className="p-8 border-b border-white/5 relative flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0070f3]/10 flex items-center justify-center border border-[#0070f3]/20">
                <UserPlus className="w-7 h-7 text-[#0070f3]" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">Vincular Fiel</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#0070f3]/60">Associe esta comanda a um cliente</p>
              </div>
            </div>
            <button onClick={() => setIsLinkCustomerOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Busca Rápida (A-Z)</label>
              <div className="bg-[#0d1117] p-4 rounded-xl border border-white/5">
                <div className="grid grid-cols-7 gap-1">
                  {['TODOS', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map(letter => (
                    <button
                      key={letter}
                      onClick={() => setLinkLetterFilter(letter)}
                      className={cn(
                        "aspect-square rounded-md text-[10px] font-black transition-all flex items-center justify-center min-w-[32px] min-h-[32px]",
                        linkLetterFilter === letter ? "bg-[#0070f3] text-white shadow-[0_0_15px_rgba(0,112,243,0.5)]" : "text-muted-foreground hover:text-white"
                      )}
                    >
                      {letter === 'TODOS' ? 'T' : letter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Selecionar Cliente</label>
              <Select value={linkCustomerId} onValueChange={setLinkCustomerId}>
                <SelectTrigger className="h-16 bg-[#0d1117] border-white/5 text-lg font-bold rounded-xl">
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent className="bg-[#05070a] border-white/5 max-h-[300px] custom-scrollbar">
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

          <DialogFooter className="p-8 border-t border-white/5 bg-[#05070a] flex-row gap-4">
            <Button variant="ghost" onClick={() => setIsLinkCustomerOpen(false)} className="flex-1 h-14 font-black uppercase tracking-widest">Cancelar</Button>
            <Button 
              onClick={handleLinkCustomer} 
              disabled={!linkCustomerId || isProcessing}
              className="flex-1 h-14 font-black uppercase tracking-widest bg-[#0070f3] hover:bg-[#0070f3]/90"
            >
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-[#05070a] border-none max-w-lg text-white p-0 overflow-hidden flex flex-col max-h-[95vh] shadow-2xl">
          <div className="p-8 border-b border-white/5 relative flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">{order.customerName}</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-green-500/60 flex items-center gap-2">
                  <Receipt className="w-3 h-3" /> Checkout & Conciliação
                </p>
              </div>
            </div>
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="bg-[#0d1117] p-8 rounded-2xl border border-dashed border-green-500/30 text-center space-y-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Valor a Receber</p>
              <p className="text-5xl font-black text-[#0070f3] tracking-tighter leading-none">R$ {checkoutAmount.toFixed(2)}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Valor a Pagar Agora</label>
                <Input 
                  type="number" 
                  step="0.01"
                  className="h-16 bg-[#0d1117] border-white/5 text-2xl font-black text-center focus:ring-[#0070f3]/20 focus:border-[#0070f3]"
                  value={checkoutAmount}
                  onChange={(e) => setCheckoutAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Desconto</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="h-14 bg-[#0d1117] border-white/5 font-bold"
                    value={checkoutDiscount}
                    onChange={(e) => setCheckoutDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Ajuste</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="h-14 bg-[#0d1117] border-white/5 font-bold"
                    value={checkoutAdjustment}
                    onChange={(e) => setCheckoutAdjustment(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Data do Atendimento</label>
                <Input 
                  type="date"
                  className="h-14 bg-[#0d1117] border-white/5 font-bold"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Forma de Pagamento</label>
                <Select value={checkoutPaymentMethod} onValueChange={setCheckoutPaymentMethod}>
                  <SelectTrigger className="h-14 bg-[#0d1117] border-white/5 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05070a] border-white/5">
                    {['DINHEIRO', 'PIX', 'CARTÃO DE CRÉDITO', 'CARTÃO DE DÉBITO', 'VALE REFEIÇÃO'].map(method => (
                      <SelectItem key={method} value={method} className="font-bold uppercase tracking-widest">{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-white/5 bg-[#05070a] flex-row gap-4">
            <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)} className="flex-1 h-16 font-black uppercase tracking-widest">Voltar</Button>
            <Button 
              onClick={handleFinalizeCheckout} 
              disabled={isProcessing}
              className="flex-1 h-16 font-black uppercase tracking-widest bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
            >
              {isProcessing ? 'Finalizando...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        onConfirm={handleDeleteOrder}
        title="Excluir Comanda"
        description="Tem certeza que deseja excluir esta comanda? Esta ação não pode ser desfeita."
      />

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        onConfirm={handleClearItems}
        title="Limpar Comanda"
        description="Deseja remover todos os itens desta comanda?"
      />

      <ConfirmDialog
        isOpen={isRemoveItemConfirmOpen}
        onOpenChange={setIsRemoveItemConfirmOpen}
        onConfirm={handleRemoveItem}
        title="Remover Item"
        description="Deseja remover este item da comanda?"
      />
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, updateDoc, doc, orderBy, deleteDoc, setDoc } from 'firebase/firestore';
import { Order, Product, UserProfile, Customer, Category, GameModality } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Plus, Search, ShoppingCart, CheckCircle2, ChevronRight, LayoutGrid, List, Zap, Activity, Clock, TrendingUp, TrendingDown, Trash2, ShieldCheck, UserPlus, UserCheck, Menu, X, Receipt, Package, Calendar, Minus, Gamepad2, ArrowLeft, PlusCircle, Users, FlaskConical } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn, getShiftDate } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function Dashboard({ user, setActiveTab }: { user: UserProfile, setActiveTab: (tab: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [gameModalities, setGameModalities] = useState<GameModality[]>([]);
  const [search, setSearch] = useState('');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
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

    const unsubGames = onSnapshot(collection(db, 'game_modalities'), (snapshot) => {
      setGameModalities(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as GameModality)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'game_modalities'));

    return () => {
      unsubscribe();
      unsubProducts();
      unsubCustomers();
      unsubCategories();
      unsubGames();
    };
  }, []);

  const handleCreateOrder = async (name: string, type: 'table' | 'customer', customerId: string = '', isNewCustomer: boolean = false) => {
    setIsCreatingOrder(true);
    let finalCustomerId = customerId;
    let finalCustomerName = name;

    try {
      if (type === 'customer' && isNewCustomer) {
        try {
          const docRef = await addDoc(collection(db, 'customers'), {
            name: name,
            createdAt: serverTimestamp()
          });
          finalCustomerId = docRef.id;
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'customers');
          setIsCreatingOrder(false);
          return;
        }
      }

      await addDoc(collection(db, 'open_orders'), {
        customerName: finalCustomerName,
        customerId: finalCustomerId,
        type,
        status: 'open',
        items: [],
        totalAmount: 0,
        createdAt: serverTimestamp(),
        shiftDate: getShiftDate(),
        createdBy: user.uid
      });
      
      setNewCustomerName('');
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

        <Card 
          className="bg-card border-border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => setSearch('')}
        >
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

        <Card 
          className="bg-card border-border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => setActiveTab('finances')}
        >
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
            }
          }}>
            <DialogTrigger nativeButton={true} render={
              <Button className="h-16 px-8 bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[#0070f3]/20 gap-2 hidden md:flex">
                <Plus className="w-5 h-5" />
                ABRIR COMANDA
              </Button>
            } />
            {/* FAB for Mobile */}
            <DialogTrigger nativeButton={true} render={
              <button className="md:hidden fixed bottom-24 right-6 w-16 h-16 bg-[#0070f3] text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-transform">
                <Plus className="w-8 h-8" />
              </button>
            } />
            <DialogContent className="bg-[#05070a] border-none max-w-2xl text-white p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl rounded-3xl">
              <div className="p-6 md:p-8 border-b border-white/5 relative flex-shrink-0 bg-[#05070a]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0070f3]/10 flex items-center justify-center border border-[#0070f3]/20 shadow-lg">
                    <UserPlus className="w-7 h-7 text-[#0070f3]" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">Nova Comanda</DialogTitle>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[#0070f3]/60 flex items-center gap-2">
                      <Zap className="w-3 h-3" /> Inicie o atendimento operacional
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsNewOrderOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black tracking-widest uppercase text-[#0070f3] ml-1">Para quem é esta comanda?</label>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-[#0070f3] transition-colors" />
                    <Input 
                      placeholder="NOME DO CLIENTE, MESA OU BALCÃO..." 
                      className="h-20 pl-14 bg-[#0d1117] border-white/5 focus:ring-[#0070f3]/20 focus:border-[#0070f3] text-xl md:text-2xl font-black rounded-2xl uppercase tracking-tight shadow-inner"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      autoFocus
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Digite qualquer coisa e o sistema irá sugerir as melhores opções abaixo</p>
                </div>

                <div className="space-y-4">
                  {newCustomerName.trim().length === 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                       {['MESA 01', 'MESA 02', 'MESA 03', 'BALCÃO'].map(sug => (
                        <button 
                          key={sug}
                          onClick={() => handleCreateOrder(sug, 'table')}
                          disabled={isCreatingOrder}
                          className="py-6 px-4 bg-[#0d1117] hover:bg-[#161b22] border border-white/5 disabled:opacity-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex flex-col items-center gap-2"
                        >
                          <Package className="w-6 h-6 text-muted-foreground" />
                          {sug}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      
                      {/* 1. Mesa / Balcão Option */}
                      <button 
                        onClick={() => handleCreateOrder(newCustomerName, 'table')}
                        disabled={isCreatingOrder}
                        className="w-full p-4 bg-[#0d1117] hover:bg-[#161b22] border border-[#0070f3]/20 disabled:opacity-50 rounded-2xl text-left transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                             <Package className="w-5 h-5 text-white/50 group-hover:text-[#0070f3] transition-colors" />
                           </div>
                           <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-[#0070f3] mb-1">Mesa / Balcão (Sem Cadastro)</p>
                             <p className="text-lg font-black uppercase tracking-widest">{newCustomerName}</p>
                           </div>
                        </div>
                        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-white" />
                      </button>

                      {/* 2. Cliente Fiel (Matching ones) */}
                      {customers
                        .filter(c => c.name.toUpperCase().includes(newCustomerName.toUpperCase()))
                        .map(customer => (
                          <button 
                            key={customer.id}
                            onClick={() => handleCreateOrder(customer.name, 'customer', customer.id)}
                            disabled={isCreatingOrder}
                            className="w-full p-4 bg-[#0d1117] hover:bg-[#161b22] border border-green-500/20 disabled:opacity-50 rounded-2xl text-left transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                 <UserCheck className="w-5 h-5 text-green-500" />
                               </div>
                               <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Cliente Fiel Localizado</p>
                                 <p className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                                   {customer.name}
                                   {(customer.balance || 0) < 0 && (
                                     <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded-md text-[10px]">DÉBITO R$ {Math.abs(customer.balance || 0).toFixed(2)}</span>
                                   )}
                                   {(customer.balance || 0) > 0 && (
                                     <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-md text-[10px]">CRÉDITO R$ {(customer.balance || 0).toFixed(2)}</span>
                                   )}
                                 </p>
                               </div>
                            </div>
                            <Plus className="w-6 h-6 text-muted-foreground group-hover:text-white" />
                          </button>
                        ))
                      }

                      {/* 3. New Customer Option (Only if exact match doesn't exist) */}
                      {!customers.some(c => c.name.toUpperCase() === newCustomerName.toUpperCase()) && (
                        <button 
                          onClick={() => handleCreateOrder(newCustomerName, 'customer', '', true)}
                          disabled={isCreatingOrder}
                          className="w-full p-4 bg-[#0d1117] hover:bg-[#161b22] border border-purple-500/20 disabled:opacity-50 rounded-2xl text-left transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                               <UserPlus className="w-5 h-5 text-purple-500" />
                             </div>
                             <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-1">Cadastrar e Abrir Comanda</p>
                               <p className="text-lg font-black uppercase tracking-widest">{newCustomerName}</p>
                             </div>
                          </div>
                          <Plus className="w-6 h-6 text-muted-foreground group-hover:text-white" />
                        </button>
                      )}

                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="p-6 md:p-8 border-t border-white/5 bg-[#05070a] flex-row gap-4 flex-shrink-0">
                <Button variant="ghost" onClick={() => setIsNewOrderOpen(false)} disabled={isCreatingOrder} className="flex-1 max-w-[200px] h-16 font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-2xl">Fechar</Button>
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
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <OrderCard order={order} products={products} customers={customers} categories={categories} gameModalities={gameModalities} viewMode={viewMode} />
            </motion.div>
          ))}
        </AnimatePresence>
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

const OrderCard: React.FC<{ order: Order; products: Product[]; customers: Customer[]; categories: Category[]; gameModalities: GameModality[]; viewMode: 'grid' | 'list' }> = ({ order, products, customers, categories, gameModalities, viewMode }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isRemoveItemConfirmOpen, setIsRemoveItemConfirmOpen] = useState(false);
  const [isLinkCustomerOpen, setIsLinkCustomerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [itemToRemoveIndex, setItemToRemoveIndex] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [linkCustomerId, setLinkCustomerId] = useState('');
  const [linkLetterFilter, setLinkLetterFilter] = useState('TODOS');
  const [linkBalanceFilter, setLinkBalanceFilter] = useState<'all' | 'credit' | 'debt'>('all');
  const [checkoutLetterFilter, setCheckoutLetterFilter] = useState('TODOS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailTab, setDetailTab] = useState<'menu' | 'cart'>('menu');
  const [menuSubTab, setMenuSubTab] = useState<'products' | 'games'>('products');
  const [isGameValueModalOpen, setIsGameValueModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameModality | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [gameValue, setGameValue] = useState('');
  const [isProductValueModalOpen, setIsProductValueModalOpen] = useState(false);
  const [productValue, setProductValue] = useState('');
  const [isAvulsoModalOpen, setIsAvulsoModalOpen] = useState(false);
  const [avulsoSearch, setAvulsoSearch] = useState('');
  const [avulsoPrice, setAvulsoPrice] = useState('');
  const [avulsoCost, setAvulsoCost] = useState('');
  const [selectedAvulsoProduct, setSelectedAvulsoProduct] = useState<Product | null>(null);

  // Checkout states
  const [checkoutAmount, setCheckoutAmount] = useState(order.totalAmount);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutAdjustment, setCheckoutAdjustment] = useState(0);
  const [checkoutPayments, setCheckoutPayments] = useState<{method: string, amount: number}[]>([]);
  const [checkoutDate, setCheckoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkoutCustomerId, setCheckoutCustomerId] = useState(order.customerId || 'none');

  useEffect(() => {
    if (isCheckoutOpen) {
      const total = order.totalAmount - checkoutDiscount + checkoutAdjustment;
      setCheckoutAmount(total);
      setCheckoutPayments([{ method: 'DINHEIRO', amount: total }]);
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

  const handleAddItem = async (product: Product, customPrice?: number, customCost?: number) => {
    const finalPrice = customPrice !== undefined ? customPrice : product.price;
    const finalCost = customCost !== undefined ? customCost : (product.cost || 0);
    
    // Dose control warning
    if (product.isDoseControl) {
      const bottle = product.linkedProductId 
        ? products.find(p => p.id === product.linkedProductId)
        : product;
      
      if (bottle) {
        const currentVol = bottle.currentBottleVolume !== undefined ? bottle.currentBottleVolume : (bottle.volumePerUnit || 0);
        const stock = bottle.stock || 0;
        if (currentVol <= 0 && stock <= 0) {
          toast.error(`Atenção: A garrafa de ${bottle.name} está vazia e sem estoque!`);
        } else if (currentVol < (product.doseSize || 0) && stock <= 0) {
          toast.warning(`Atenção: Volume insuficiente na última garrafa de ${bottle.name}`);
        }
      }
    }

    // For dose control products, we want to keep them as separate entries if they have different IDs 
    // or if they are "open value" to ensure they don't merge incorrectly.
    // However, for standard products, we merge by productId and price.
    const existingItemIndex = order.items.findIndex(i => i.productId === product.id && i.price === finalPrice);
    let newItems = [...order.items];

    if (existingItemIndex > -1 && !product.isOpenValue) {
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newItems[existingItemIndex].quantity + 1,
        subtotal: (newItems[existingItemIndex].quantity + 1) * finalPrice,
        costPrice: finalCost
      };
    } else {
      newItems.push({
        // If it's open value, we definitely need a unique ID to avoid merging different open values
        productId: product.isOpenValue ? `${product.id}_${Date.now()}` : product.id,
        productName: product.name,
        quantity: 1,
        price: finalPrice,
        subtotal: finalPrice,
        costPrice: finalCost
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

  const handleManualAdd = async (name: string, price: number, cost: number, product?: Product) => {
    let newItems = [...order.items];
    const itemId = product ? product.id : `manual_${Date.now()}`;
    const finalId = (product?.isOpenValue || !product) ? `${itemId}_${Date.now()}` : itemId;

    const existingItemIndex = newItems.findIndex(i => i.productId === finalId && i.price === price);

    if (existingItemIndex > -1) {
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newItems[existingItemIndex].quantity + 1,
        subtotal: (newItems[existingItemIndex].quantity + 1) * price,
        costPrice: cost
      };
    } else {
      newItems.push({
        productId: finalId,
        productName: product ? product.name : `[AVULSO] ${name}`,
        quantity: 1,
        price: price,
        subtotal: price,
        costPrice: cost
      });
    }

    const newTotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: newItems,
        totalAmount: newTotal
      });
      toast.success(`Adicionado: ${name}`);
      setIsAvulsoModalOpen(false);
      setAvulsoSearch('');
      setAvulsoPrice('');
      setAvulsoCost('');
      setSelectedAvulsoProduct(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateQuantity = async (index: number, delta: number) => {
    if (index === -1 || !order.items[index]) return;

    let newItems = [...order.items];
    const newQuantity = newItems[index].quantity + delta;

    if (newQuantity <= 0) {
      newItems = newItems.filter((_, i) => i !== index);
    } else {
      newItems[index] = {
        ...newItems[index],
        quantity: newQuantity,
        subtotal: newQuantity * newItems[index].price
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

  const handleAddGame = async (game: GameModality, customPrice?: number) => {
    const finalPrice = customPrice !== undefined ? customPrice : game.price;
    const gameId = `game_${game.id}_${Date.now()}`; // Unique ID for each game entry
    
    let newItems = [...order.items];
    newItems.push({
      productId: gameId,
      productName: `[JOGO] ${game.name}`,
      quantity: 1,
      price: finalPrice,
      subtotal: finalPrice
    });

    const newTotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: newItems,
        totalAmount: newTotal
      });
      toast.success(`Adicionado: ${game.name}`);
      setIsGameValueModalOpen(false);
      setGameValue('');
      setSelectedGame(null);
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
    const totalPaid = checkoutPayments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < checkoutAmount - 0.01) {
      toast.error('O total dos pagamentos deve ser igual ou maior ao valor a receber');
      return;
    }

    setIsProcessing(true);
    try {
      const finalAmount = checkoutAmount;
      const targetCustomerId = checkoutCustomerId || order.customerId;
      const surplus = totalPaid - finalAmount;

      await updateDoc(doc(db, 'open_orders', order.id), {
        status: 'closed',
        closedAt: serverTimestamp(),
        closedShiftDate: getShiftDate(),
        totalAmount: finalAmount,
        payments: checkoutPayments.map(p => ({ ...p, date: new Date() })),
        customerId: targetCustomerId === 'none' ? '' : targetCustomerId
      });
      
      if (targetCustomerId && targetCustomerId !== 'none') {
        const customerRef = doc(db, 'customers', targetCustomerId);
        const customer = customers.find(c => c.id === targetCustomerId);
        if (customer) {
          const fiadoAmount = checkoutPayments
            .filter(p => p.method === 'FIADO')
            .reduce((sum, p) => sum + p.amount, 0);
          
          const saldoUsedAmount = checkoutPayments
            .filter(p => p.method === 'SALDO')
            .reduce((sum, p) => sum + p.amount, 0);

          // Balance Impact: Surplus increases balance, FIADO and SALDO decrease it
          const balanceImpact = surplus - fiadoAmount - saldoUsedAmount;

          await updateDoc(customerRef, {
            totalSpent: (customer.totalSpent || 0) + finalAmount,
            orderCount: (customer.orderCount || 0) + 1,
            balance: (customer.balance || 0) + balanceImpact,
            lastVisit: serverTimestamp()
          });
        }
      }

      // Calculate total cost and subtract stock
      let totalCost = 0;
      for (const item of order.items) {
        totalCost += (item.costPrice || 0) * item.quantity;

        // Subtract stock for registered products
        if (!item.productId.startsWith('manual_') && !item.productId.startsWith('game_')) {
          const baseProductId = item.productId.split('_')[0];
          const product = products.find(p => p.id === baseProductId);
          
          if (product) {
            const productRef = doc(db, 'products', baseProductId);
            
            if (product.isDoseControl && product.linkedProductId) {
              // It's a DOSE. Subtract from the LINKED BOTTLE.
              const bottleId = product.linkedProductId;
              const bottle = products.find(p => p.id === bottleId);
              
              if (bottle) {
                const bottleRef = doc(db, 'products', bottleId);
                const totalMlSold = (product.doseSize || 0) * item.quantity;
                const volPerUnit = bottle.volumePerUnit || 0;
                
                let newCurrentVolume = (bottle.currentBottleVolume !== undefined ? bottle.currentBottleVolume : volPerUnit) - totalMlSold;
                let newStock = bottle.stock || 0;

                // If volume goes negative, open a new bottle
                if (volPerUnit > 0) {
                  while (newCurrentVolume < 0 && newStock > 0) {
                    newStock -= 1;
                    newCurrentVolume += volPerUnit;
                  }
                }

                // If volume is still negative (out of stock), cap it at 0
                if (newCurrentVolume < 0) {
                  newCurrentVolume = 0;
                  newStock = 0;
                }

                await updateDoc(bottleRef, {
                  stock: Math.max(0, newStock),
                  currentBottleVolume: Math.max(0, newCurrentVolume)
                });
              }
            } else if (product.isDoseControl && !product.linkedProductId) {
              // It's a BOTTLE sold as a whole.
              const newStock = Math.max(0, (product.stock || 0) - item.quantity);
              const updateData: any = { stock: newStock };
              
              // If stock reaches 0, also clear current volume
              if (newStock === 0) {
                updateData.currentBottleVolume = 0;
              }
              
              await updateDoc(productRef, updateData);
            } else {
              // Normal product
              await updateDoc(productRef, {
                stock: Math.max(0, (product.stock || 0) - item.quantity)
              });
            }
          }
        }
      }

      // Create transactions for each payment
      for (const payment of checkoutPayments) {
        // Proportional cost for this payment
        const paymentCost = finalAmount > 0 ? (payment.amount / finalAmount) * totalCost : 0;

        await addDoc(collection(db, 'transactions'), {
          type: 'income',
          category: 'Vendas',
          amount: payment.amount,
          cost: paymentCost,
          description: `Comanda fechada: ${order.customerName} (${payment.method})${checkoutDiscount > 0 ? ` (Desc: R$ ${checkoutDiscount})` : ''}${checkoutAdjustment !== 0 ? ` (Ajuste: R$ ${checkoutAdjustment})` : ''}`,
          date: new Date(checkoutDate + 'T12:00:00'),
          orderId: order.id,
          paymentMethod: payment.method,
          isFiado: payment.method === 'FIADO' // Mark for filtering in reports
        });
      }

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
    if (itemToRemoveIndex === null) return;
    const newItems = order.items.filter((_, i) => i !== itemToRemoveIndex);
    const newTotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: newItems,
        totalAmount: newTotal
      });
      toast.success('Item removido');
      setItemToRemoveIndex(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogTrigger nativeButton={false} render={viewMode === 'list' ? (
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
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={isProcessing}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteConfirmOpen(true);
                    }}
                    className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
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
        <DialogContent className="max-w-[95vw] md:max-w-7xl bg-[#05070a] border-none text-white p-0 overflow-hidden h-[95vh] md:h-[90vh] flex flex-col shadow-2xl rounded-3xl">
          {/* Header - Optimized for all screens */}
          <div className="p-4 md:p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between bg-[#05070a] z-20 gap-4 flex-shrink-0 relative">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[#0d1117] flex items-center justify-center border border-white/5 shadow-lg">
                <Receipt className="w-6 h-6 md:w-8 md:h-8 text-[#0070f3]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <DialogTitle className="text-xl md:text-4xl font-black uppercase tracking-tighter leading-none truncate max-w-[180px] md:max-w-none">
                    {order.customerName}
                  </DialogTitle>
                  {order.type === 'customer' && (
                    <Badge className="bg-[#0070f3]/10 text-[#0070f3] border-[#0070f3]/20 text-[10px] font-black uppercase tracking-widest">FIEL</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'HH:mm') : 'AGORA'}
                  </span>
                  {order.type === 'table' && (
                    <button 
                      className="text-[10px] font-black tracking-widest uppercase text-[#0070f3] hover:underline transition-all"
                      onClick={() => setIsLinkCustomerOpen(true)}
                    >
                      VINCULAR CLIENTE
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">TOTAL ACUMULADO</p>
              <p className="text-3xl md:text-5xl font-black tracking-tighter text-[#0070f3] flex items-baseline gap-1">
                <span className="text-sm md:text-xl font-bold">R$</span>
                {(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>

            <button 
              onClick={() => setIsDetailOpen(false)} 
              className="absolute right-4 top-4 md:right-8 md:top-8 text-muted-foreground hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Content Area - Split View on Desktop, Tabs on Mobile */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-[#05070a]">
            
            {/* Left Side: Menu/Catalog (Always visible on Desktop, Tabbed on Mobile) */}
            <div className={cn(
              "flex-1 flex flex-col border-r border-white/5 overflow-hidden",
              detailTab !== 'menu' && "hidden lg:flex"
            )}>
              {/* Mobile Tabs (Only visible on Mobile) */}
              <div className="flex lg:hidden px-4 md:px-8 py-4 bg-[#05070a] border-b border-white/5 gap-8">
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

              <div className="flex-1 flex flex-col p-4 md:p-8 space-y-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-[#0070f3] transition-colors" />
                    <Input 
                      placeholder="BUSCAR ITEM NO CARDÁPIO..." 
                      className="pl-12 h-14 bg-[#0d1117] border-white/5 rounded-2xl text-sm font-bold tracking-widest focus:ring-[#0070f3]/20 focus:border-[#0070f3] transition-all uppercase"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={() => setIsAvulsoModalOpen(true)}
                    className="h-14 px-6 bg-[#161b22] hover:bg-[#1d242d] border border-white/5 text-[#0070f3] rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Lançamento Avulso
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                  {/* Menu Sub-tabs */}
                  <div className="flex gap-2 mb-4">
                    <button 
                      onClick={() => setMenuSubTab('products')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        menuSubTab === 'products' ? "bg-[#161b22] text-[#0070f3] border border-[#0070f3]/20" : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"
                      )}
                    >
                      Cardápio Geral
                    </button>
                    <button 
                      onClick={() => setMenuSubTab('games')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        menuSubTab === 'games' ? "bg-[#161b22] text-[#0070f3] border border-[#0070f3]/20" : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"
                      )}
                    >
                      Banca / Jogos
                    </button>
                  </div>

                  {menuSubTab === 'products' ? (
                    <>
                      {/* Quick Add Section (Intelligent Feature) */}
                      {!itemSearch && (
                        <div className="mb-8">
                          <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-4 flex items-center gap-2">
                            <Zap className="w-3 h-3 text-yellow-500" /> Itens Mais Pedidos
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                            {products.slice(0, 4).map(product => (
                              <button
                                key={`quick-${product.id}`}
                                onClick={() => {
                                  if (product.isOpenValue) {
                                    setSelectedProduct(product);
                                    setIsProductValueModalOpen(true);
                                  } else {
                                    handleAddItem(product);
                                  }
                                }}
                                className="p-4 bg-[#0d1117] hover:bg-[#161b22] border border-white/5 rounded-2xl text-left transition-all group relative overflow-hidden active:scale-95"
                              >
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus className="w-4 h-4 text-[#0070f3]" />
                                </div>
                                <p className="font-bold text-[11px] uppercase tracking-wider mb-1 truncate">{product.name}</p>
                                <p className="text-xs font-black text-[#0070f3]">
                                  {product.isOpenValue ? 'VALOR ABERTO' : `R$ ${product.price.toFixed(2)}`}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-2">Categorias</p>
                      <div className="space-y-3">
                        {sortedCategories.map(category => (
                          <div key={category.id} className="bg-[#0d1117] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                            <button 
                              onClick={() => {
                                setExpandedCategories(prev => 
                                  prev.includes(category.id) ? prev.filter(id => id !== category.id) : [...prev, category.id]
                                );
                              }}
                              className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-white transition-colors">
                                  <Package className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                  <span className="font-black text-sm uppercase tracking-widest block">{category.name}</span>
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {products.filter(p => (p.categoryId || 'Outros') === category.id).length} Produtos Disponíveis
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className={cn("w-5 h-5 text-muted-foreground transition-transform", expandedCategories.includes(category.id) && "rotate-90")} />
                            </button>
                            
                            <AnimatePresence>
                              {expandedCategories.includes(category.id) && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden border-t border-white/5 bg-black/20"
                                >
                                  <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {products
                                      .filter(p => (p.categoryId || 'Outros') === category.id)
                                      .filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()))
                                      .map(product => (
                                        <button
                                          key={product.id}
                                          onClick={() => {
                                            if (product.isOpenValue) {
                                              setSelectedProduct(product);
                                              setIsProductValueModalOpen(true);
                                            } else {
                                              handleAddItem(product);
                                            }
                                          }}
                                          className="w-full p-4 flex items-center justify-between rounded-xl hover:bg-white/10 transition-all text-left group border border-transparent hover:border-white/5"
                                        >
                                          <div className="min-w-0">
                                            <p className="font-bold text-xs uppercase tracking-wider group-hover:text-[#0070f3] transition-colors truncate">{product.name}</p>
                                            <div className="flex flex-col gap-0.5">
                                              <p className="text-[10px] text-muted-foreground font-black tracking-widest">
                                                {product.isOpenValue ? 'VALOR ABERTO' : `R$ ${product.price.toFixed(2)}`}
                                              </p>
                                              {product.isDoseControl && (
                                                <p className="text-[9px] text-[#0070f3]/70 font-black uppercase tracking-widest flex items-center gap-1">
                                                  <FlaskConical className="w-2.5 h-2.5" />
                                                  {product.linkedProductId ? (
                                                    <>Garrafa: {products.find(p => p.id === product.linkedProductId)?.currentBottleVolume || 0}ml rest.</>
                                                  ) : (
                                                    <>{product.currentBottleVolume || 0}ml rest. na garrafa</>
                                                  )}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#0070f3] group-hover:text-white transition-all">
                                            <Plus className="w-4 h-4" />
                                          </div>
                                        </button>
                                      ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {gameModalities
                          .filter(g => g.active)
                          .filter(g => g.name.toLowerCase().includes(itemSearch.toLowerCase()))
                          .map(game => (
                            <button
                              key={game.id}
                              onClick={() => {
                                if (game.isOpenValue) {
                                  setSelectedGame(game);
                                  setIsGameValueModalOpen(true);
                                } else {
                                  handleAddGame(game);
                                }
                              }}
                              className="p-6 bg-[#0d1117] hover:bg-[#161b22] border border-white/5 rounded-2xl text-left transition-all group relative overflow-hidden active:scale-95 flex items-center gap-4"
                            >
                              <div className="w-12 h-12 rounded-xl bg-[#0070f3]/10 flex items-center justify-center text-[#0070f3] group-hover:bg-[#0070f3] group-hover:text-white transition-all">
                                <Gamepad2 className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-sm uppercase tracking-wider truncate mb-1">{game.name}</p>
                                <p className="text-xs font-bold text-[#0070f3] uppercase tracking-widest">
                                  {game.isOpenValue ? 'Valor Aberto' : `R$ ${game.price.toFixed(2)}`}
                                </p>
                              </div>
                              <Plus className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
                            </button>
                          ))}
                        {gameModalities.filter(g => g.active).length === 0 && (
                          <div className="col-span-full py-20 text-center opacity-40">
                            <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-[10px] font-black tracking-widest uppercase">Nenhuma modalidade de jogo ativa</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Cart/Sacola (Always visible on Desktop, Tabbed on Mobile) */}
            <div className={cn(
              "w-full lg:w-[450px] flex flex-col bg-[#0d1117]/50 lg:bg-[#0d1117] overflow-hidden",
              detailTab !== 'cart' && "hidden lg:flex"
            )}>
              <div className="p-6 md:p-8 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setDetailTab('menu')}
                      className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white transition-all mr-1"
                      title="Voltar para o Cardápio"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-[#0070f3]/10 flex items-center justify-center text-[#0070f3]">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest">Sua Sacola</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {order.items.reduce((sum, i) => sum + i.quantity, 0)} Itens Selecionados
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsClearConfirmOpen(true)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Limpar Sacola"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                  <AnimatePresence mode="popLayout">
                    {order.items.map((item, index) => (
                      <motion.div 
                        key={`${item.productId}-${index}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#161b22] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm uppercase tracking-tight truncate leading-none mb-1">{item.productName}</p>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">R$ {item.price.toFixed(2)} / UN</p>
                            {(() => {
                              const product = products.find(p => p.id === item.productId.split('_')[0]);
                              if (product?.isDoseControl) {
                                const bottle = product.linkedProductId 
                                  ? products.find(p => p.id === product.linkedProductId)
                                  : product;
                                return (
                                  <p className="text-[9px] text-[#0070f3]/70 font-black uppercase tracking-widest flex items-center gap-1">
                                    <FlaskConical className="w-2.5 h-2.5" />
                                    {bottle?.name || 'Garrafa'}: {bottle?.currentBottleVolume || 0}ml rest.
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-[#05070a] rounded-xl p-1 border border-white/5">
                            <button 
                              onClick={() => handleUpdateQuantity(index, -1)}
                              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(index, 1)}
                              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button 
                            onClick={() => {
                              setItemToRemoveIndex(index);
                              setIsRemoveItemConfirmOpen(true);
                            }}
                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {order.items.length === 0 && (
                    <div className="py-20 text-center opacity-40">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-[10px] font-black tracking-widest uppercase">Nenhum item na sacola</p>
                    </div>
                  )}
                </div>

                {/* Summary in Cart Side */}
                <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Subtotal</p>
                    <p className="font-bold text-sm">R$ {(order.totalAmount || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Taxas / Outros</p>
                    <p className="font-bold text-sm">R$ 0.00</p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs font-black tracking-widest uppercase text-[#0070f3]">Total Geral</p>
                    <p className="text-2xl font-black tracking-tighter text-[#0070f3]">R$ {(order.totalAmount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Sticky at bottom of cart */}
              <div className="p-6 md:p-8 bg-[#0d1117] border-t border-white/5 grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => setIsCheckoutOpen(true)}
                  variant="outline"
                  className="h-14 bg-transparent border-green-500/30 text-green-500 hover:bg-green-500/10 font-black uppercase tracking-widest rounded-2xl gap-2 text-xs"
                >
                  <Receipt className="w-4 h-4" />
                  RECEBER
                </Button>
                <Button 
                  onClick={() => setIsDetailOpen(false)}
                  className="h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-green-600/20 text-xs"
                >
                  SALVAR
                </Button>
              </div>
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
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Filtros de Busca</label>
              <div className="bg-[#0d1117] p-4 rounded-xl border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setLinkBalanceFilter('all')}
                    className={cn(
                      "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      linkBalanceFilter === 'all' ? "bg-white/10 text-white" : "bg-transparent text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setLinkBalanceFilter('debt')}
                    className={cn(
                      "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      linkBalanceFilter === 'debt' ? "bg-red-500/20 text-red-500" : "bg-transparent text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    Em Débito
                  </button>
                  <button
                    onClick={() => setLinkBalanceFilter('credit')}
                    className={cn(
                      "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      linkBalanceFilter === 'credit' ? "bg-green-500/20 text-green-500" : "bg-transparent text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    Em Crédito
                  </button>
                </div>
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
                  <SelectValue placeholder="Selecione um cliente...">
                    {linkCustomerId ? customers.find(c => c.id === linkCustomerId)?.name : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#05070a] border-white/5 max-h-[300px] custom-scrollbar">
                  {customers
                    .filter(c => {
                      if (linkBalanceFilter === 'debt' && (c.balance || 0) >= 0) return false;
                      if (linkBalanceFilter === 'credit' && (c.balance || 0) <= 0) return false;
                      if (linkLetterFilter === 'TODOS') return true;
                      return c.name.toUpperCase().startsWith(linkLetterFilter);
                    })
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(customer => (
                      <SelectItem key={customer.id} value={customer.id} className="text-sm font-bold uppercase tracking-widest py-3">
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{customer.name}</span>
                          {(customer.balance || 0) < 0 && (
                             <span className="text-red-500 text-[10px] font-black">DÉBITO R$ {Math.abs(customer.balance || 0).toFixed(2)}</span>
                          )}
                          {(customer.balance || 0) > 0 && (
                             <span className="text-green-500 text-[10px] font-black">CRÉDITO R$ {(customer.balance || 0).toFixed(2)}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  {customers.filter(c => {
                      if (linkBalanceFilter === 'debt' && (c.balance || 0) >= 0) return false;
                      if (linkBalanceFilter === 'credit' && (c.balance || 0) <= 0) return false;
                      if (linkLetterFilter === 'TODOS') return true;
                      return c.name.toUpperCase().startsWith(linkLetterFilter);
                    }).length === 0 && (
                      <div className="p-8 text-center text-muted-foreground uppercase text-[10px] font-black tracking-widest">Nenhum cliente cadastrado</div>
                  )}
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

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-[#05070a] border-none max-w-2xl text-white p-0 overflow-hidden flex flex-col max-h-[95vh] shadow-2xl rounded-3xl">
          <div className="p-6 md:p-8 border-b border-white/5 relative flex-shrink-0 bg-[#05070a]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-lg">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">{order.customerName}</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-green-500/60 flex items-center gap-2">
                  <Receipt className="w-3 h-3" /> Finalização de Atendimento
                </p>
              </div>
            </div>
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
            {/* Main Total Display */}
            <div className="bg-[#0d1117] p-8 rounded-3xl border border-white/5 text-center space-y-3 shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0070f3]/5 to-transparent opacity-50" />
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground relative z-10">Valor Total a Receber</p>
              <p className="text-5xl md:text-7xl font-black text-[#0070f3] tracking-tighter leading-none relative z-10 flex items-center justify-center gap-2">
                <span className="text-xl md:text-2xl font-bold text-[#0070f3]/60">R$</span>
                {checkoutAmount.toFixed(2)}
              </p>
              {checkoutDiscount > 0 && (
                <p className="text-xs font-bold text-green-500 relative z-10 uppercase tracking-widest">
                  Desconto Aplicado: R$ {checkoutDiscount.toFixed(2)}
                </p>
              )}
            </div>

            {/* Customer Balance Info */}
            {checkoutCustomerId !== 'none' && (
              <div className="bg-[#0d1117] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black tracking-widest uppercase text-muted-foreground">Saldo Atual do Cliente</p>
                    <p className={cn(
                      "text-sm font-black uppercase tracking-tighter",
                      (customers.find(c => c.id === checkoutCustomerId)?.balance || 0) >= 0 ? "text-green-500" : "text-orange-500"
                    )}>
                      R$ {(customers.find(c => c.id === checkoutCustomerId)?.balance || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                {(customers.find(c => c.id === checkoutCustomerId)?.balance || 0) > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const balance = customers.find(c => c.id === checkoutCustomerId)?.balance || 0;
                      const needed = checkoutAmount - checkoutPayments.reduce((sum, p) => sum + p.amount, 0);
                      const use = Math.min(balance, needed);
                      if (use > 0) {
                        setCheckoutPayments([...checkoutPayments, { method: 'SALDO', amount: use }]);
                      }
                    }}
                    className="text-[9px] font-black uppercase tracking-widest text-[#0070f3] hover:bg-[#0070f3]/10 rounded-xl"
                  >
                    Usar Saldo
                  </Button>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['DINHEIRO', 'PIX', 'CARTÃO'].map((method) => (
                <Button
                  key={`quick-pay-${method}`}
                  variant="outline"
                  onClick={() => {
                    setCheckoutPayments([{ method: method === 'CARTÃO' ? 'CARTÃO DE DÉBITO' : method, amount: checkoutAmount }]);
                  }}
                  className="h-14 bg-[#0d1117] border-white/5 hover:border-[#0070f3]/50 hover:bg-[#0070f3]/5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                >
                  Pagar Tudo ({method})
                </Button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Valor do Checkout</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
                    <Input 
                      type="number" 
                      step="0.01"
                      className="h-16 pl-12 bg-[#0d1117] border-white/5 text-2xl font-black focus:ring-[#0070f3]/20 focus:border-[#0070f3] rounded-2xl"
                      value={checkoutAmount}
                      onChange={(e) => setCheckoutAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Data do Atendimento</label>
                  <Input 
                    type="date"
                    className="h-16 bg-[#0d1117] border-white/5 font-bold rounded-2xl uppercase tracking-widest text-xs"
                    value={checkoutDate}
                    onChange={(e) => setCheckoutDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Desconto (R$)</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="h-14 bg-[#0d1117] border-white/5 font-bold rounded-xl"
                    value={checkoutDiscount}
                    onChange={(e) => setCheckoutDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Ajuste (R$)</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="h-14 bg-[#0d1117] border-white/5 font-bold rounded-xl"
                    value={checkoutAdjustment}
                    onChange={(e) => setCheckoutAdjustment(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Divisão de Pagamento</label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCheckoutPayments([...checkoutPayments, { method: 'DINHEIRO', amount: 0 }])}
                    className="h-10 text-[10px] font-black uppercase tracking-widest text-[#0070f3] hover:bg-[#0070f3]/10 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Método
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {checkoutPayments.map((payment, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex gap-3 items-end p-4 bg-[#0d1117] rounded-2xl border border-white/5"
                    >
                      <div className="flex-1 space-y-2">
                        <label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground">Método</label>
                        <Select 
                          value={payment.method} 
                          onValueChange={(val) => {
                            const newPayments = [...checkoutPayments];
                            newPayments[index].method = val;
                            setCheckoutPayments(newPayments);
                          }}
                        >
                          <SelectTrigger className="h-12 bg-[#161b22] border-white/5 font-bold text-xs uppercase rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05070a] border-white/10 rounded-2xl">
                            {['DINHEIRO', 'PIX', 'CARTÃO DE CRÉDITO', 'CARTÃO DE DÉBITO', 'VALE REFEIÇÃO', 'FIADO', 'SALDO'].map(method => (
                              <SelectItem key={method} value={method} className="font-black uppercase tracking-widest text-[10px] py-4 focus:bg-[#0070f3]/10 focus:text-[#0070f3]">
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-36 space-y-2">
                        <label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground">Valor</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">R$</span>
                          <Input 
                            type="number" 
                            step="0.01"
                            className="h-12 pl-8 bg-[#161b22] border-white/5 font-black text-sm rounded-xl"
                            value={payment.amount}
                            onChange={(e) => {
                              const newPayments = [...checkoutPayments];
                              newPayments[index].amount = parseFloat(e.target.value) || 0;
                              setCheckoutPayments(newPayments);
                            }}
                          />
                        </div>
                      </div>
                      {checkoutPayments.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setCheckoutPayments(checkoutPayments.filter((_, i) => i !== index))}
                          className="h-12 w-12 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
                
                <div className={cn(
                  "p-5 rounded-2xl text-center text-xs font-black uppercase tracking-widest transition-all shadow-lg",
                  checkoutPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2) >= checkoutAmount.toFixed(2) 
                    ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                    : "bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse"
                )}>
                  {checkoutPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2) >= checkoutAmount.toFixed(2) 
                    ? (checkoutPayments.reduce((sum, p) => sum + p.amount, 0) > checkoutAmount 
                        ? `✓ Crédito a Gerar: R$ ${(checkoutPayments.reduce((sum, p) => sum + p.amount, 0) - checkoutAmount).toFixed(2)}`
                        : "✓ Conferência de Valores OK")
                    : `⚠️ Faltam R$ ${(checkoutAmount - checkoutPayments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 md:p-8 border-t border-white/5 bg-[#05070a] flex-row gap-4 flex-shrink-0">
            <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)} className="flex-1 h-16 font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-2xl">Voltar</Button>
            <Button 
              onClick={handleFinalizeCheckout} 
              disabled={isProcessing || checkoutPayments.reduce((sum, p) => sum + p.amount, 0) < checkoutAmount - 0.01}
              className="flex-1 h-16 font-black uppercase tracking-widest bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 rounded-2xl"
            >
              {isProcessing ? 'Processando...' : 'Finalizar Recebimento'}
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

      {/* Game Value Modal */}
      <Dialog open={isGameValueModalOpen} onOpenChange={setIsGameValueModalOpen}>
        <DialogContent className="bg-[#05070a] border-none max-w-md text-white p-0 overflow-hidden shadow-2xl rounded-3xl">
          <div className="p-8 border-b border-white/5 relative bg-[#05070a]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0070f3]/10 flex items-center justify-center border border-[#0070f3]/20 shadow-lg">
                <Gamepad2 className="w-7 h-7 text-[#0070f3]" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">{selectedGame?.name}</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#0070f3]/60">Defina o valor do jogo</p>
              </div>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Valor do Lançamento (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
                <Input 
                  type="number" 
                  step="0.01"
                  autoFocus
                  className="h-20 pl-12 bg-[#0d1117] border-white/5 text-3xl font-black focus:ring-[#0070f3]/20 focus:border-[#0070f3] rounded-2xl"
                  value={gameValue}
                  onChange={(e) => setGameValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-white/5 bg-[#05070a] flex-row gap-4">
            <Button variant="ghost" onClick={() => setIsGameValueModalOpen(false)} className="flex-1 h-14 font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-xl">Cancelar</Button>
            <Button 
              onClick={() => handleAddGame(selectedGame!, parseFloat(gameValue) || 0)} 
              disabled={!gameValue || isProcessing}
              className="flex-1 h-14 font-black uppercase tracking-widest bg-[#0070f3] hover:bg-[#0070f3]/90 rounded-xl shadow-lg shadow-[#0070f3]/20"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Value Modal (Dose Personalizada) */}
      <Dialog open={isProductValueModalOpen} onOpenChange={setIsProductValueModalOpen}>
        <DialogContent className="bg-[#05070a] border-none max-w-md text-white p-0 overflow-hidden shadow-2xl rounded-3xl">
          <div className="p-8 border-b border-white/5 relative bg-[#05070a]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0070f3]/10 flex items-center justify-center border border-[#0070f3]/20 shadow-lg">
                <Package className="w-7 h-7 text-[#0070f3]" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">{selectedProduct?.name}</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#0070f3]/60">Defina o valor do item</p>
              </div>
            </div>
            {selectedProduct?.isDoseControl && (
              <div className="mt-4 p-4 bg-[#0070f3]/5 border border-[#0070f3]/10 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0070f3]/10 flex items-center justify-center text-[#0070f3]">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Garrafa Vinculada</p>
                    <p className="text-xs font-bold text-white truncate">
                      {selectedProduct.linkedProductId ? (
                        <>
                          {products.find(p => p.id === selectedProduct.linkedProductId)?.name || 'Garrafa não encontrada'}
                          <span className="text-[#0070f3] ml-2 font-black">
                            ({products.find(p => p.id === selectedProduct.linkedProductId)?.currentBottleVolume || 0}ml rest.)
                          </span>
                        </>
                      ) : (
                        <>
                          Controle Próprio
                          <span className="text-[#0070f3] ml-2 font-black">
                            ({selectedProduct.currentBottleVolume || 0}ml rest.)
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Valor do Lançamento (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
                <Input 
                  type="number" 
                  step="0.01"
                  autoFocus
                  className="h-20 pl-12 bg-[#0d1117] border-white/5 text-3xl font-black focus:ring-[#0070f3]/20 focus:border-[#0070f3] rounded-2xl"
                  value={productValue}
                  onChange={(e) => setProductValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && productValue) {
                      handleAddItem(selectedProduct!, parseFloat(productValue));
                      setIsProductValueModalOpen(false);
                      setProductValue('');
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-white/5 bg-[#05070a] flex-row gap-4">
            <Button variant="ghost" onClick={() => setIsProductValueModalOpen(false)} className="flex-1 h-14 font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-xl">Cancelar</Button>
            <Button 
              onClick={() => {
                if (productValue) {
                  handleAddItem(selectedProduct!, parseFloat(productValue));
                  setIsProductValueModalOpen(false);
                  setProductValue('');
                }
              }}
              disabled={!productValue || isProcessing}
              className="flex-1 h-14 font-black uppercase tracking-widest bg-[#0070f3] hover:bg-[#0070f3]/90 rounded-xl shadow-lg shadow-[#0070f3]/20"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avulso Modal */}
      <Dialog open={isAvulsoModalOpen} onOpenChange={setIsAvulsoModalOpen}>
        <DialogContent className="bg-[#05070a] border-none max-w-md text-white p-0 overflow-hidden shadow-2xl rounded-3xl">
          <div className="p-8 border-b border-white/5 relative bg-[#05070a]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0070f3]/10 flex items-center justify-center border border-[#0070f3]/20 shadow-lg">
                <PlusCircle className="w-7 h-7 text-[#0070f3]" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">Lançamento Avulso</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#0070f3]/60">Adicione qualquer item com valor aberto</p>
              </div>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Buscar Produto ou Digitar Nome</label>
              <div className="relative">
                <Input 
                  placeholder="NOME DO ITEM..."
                  value={avulsoSearch}
                  onChange={(e) => {
                    setAvulsoSearch(e.target.value);
                    const found = products.find(p => p.name.toLowerCase() === e.target.value.toLowerCase());
                    if (found) {
                      setSelectedAvulsoProduct(found);
                      setAvulsoPrice(found.price.toString());
                      setAvulsoCost(found.cost.toString());
                    } else {
                      setSelectedAvulsoProduct(null);
                    }
                  }}
                  className="h-14 bg-[#0d1117] border-white/5 rounded-2xl text-sm font-bold focus:ring-[#0070f3]/20 focus:border-[#0070f3]"
                />
                {avulsoSearch && !selectedAvulsoProduct && (
                  <div className="absolute z-10 w-full mt-2 bg-[#0d1117] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    {products.filter(p => p.name.toLowerCase().includes(avulsoSearch.toLowerCase())).slice(0, 5).map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedAvulsoProduct(p);
                          setAvulsoSearch(p.name);
                          setAvulsoPrice(p.price.toString());
                          setAvulsoCost(p.cost.toString());
                        }}
                        className="w-full p-4 text-left hover:bg-white/5 text-xs font-bold uppercase tracking-widest border-b border-white/5 last:border-0 transition-colors"
                      >
                        {p.name} - R$ {p.price.toFixed(2)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Preço Venda (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">R$</span>
                  <Input 
                    type="number"
                    step="0.01"
                    value={avulsoPrice}
                    onChange={(e) => setAvulsoPrice(e.target.value)}
                    className="h-14 pl-10 bg-[#0d1117] border-white/5 rounded-xl text-sm font-bold focus:ring-[#0070f3]/20 focus:border-[#0070f3]"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground ml-1">Preço Custo (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">R$</span>
                  <Input 
                    type="number"
                    step="0.01"
                    value={avulsoCost}
                    onChange={(e) => setAvulsoCost(e.target.value)}
                    className="h-14 pl-10 bg-[#0d1117] border-white/5 rounded-xl text-sm font-bold focus:ring-[#0070f3]/20 focus:border-[#0070f3]"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-white/5 bg-[#05070a] flex-row gap-4">
            <Button variant="ghost" onClick={() => setIsAvulsoModalOpen(false)} className="flex-1 h-14 font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-xl">Cancelar</Button>
            <Button 
              onClick={() => handleManualAdd(avulsoSearch, parseFloat(avulsoPrice) || 0, parseFloat(avulsoCost) || 0, selectedAvulsoProduct || undefined)}
              disabled={!avulsoSearch || !avulsoPrice || isProcessing}
              className="flex-1 h-14 font-black uppercase tracking-widest bg-[#0070f3] hover:bg-[#0070f3]/90 rounded-xl shadow-lg shadow-[#0070f3]/20"
            >
              {isProcessing ? 'Adicionando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

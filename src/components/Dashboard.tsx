import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore';
import { Order, Product, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Plus, Search, ShoppingCart, CheckCircle2, ChevronRight, LayoutGrid, List, Zap, Activity, Clock, TrendingUp, Trash2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { setDoc, serverTimestamp } from 'firebase/firestore';

export function Dashboard({ user }: { user: UserProfile }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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

    return () => {
      unsubscribe();
      unsubProducts();
    };
  }, []);

  const handleCreateOrder = async () => {
    if (!newCustomerName.trim()) return;
    try {
      await addDoc(collection(db, 'open_orders'), {
        customerName: newCustomerName,
        status: 'open',
        items: [],
        totalAmount: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      setNewCustomerName('');
      setIsNewOrderOpen(false);
      toast.success('Comanda aberta com sucesso');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'open_orders');
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

          <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
            <DialogTrigger
              nativeButton={true}
              render={
                <Button className="h-14 px-8 rounded-xl gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20">
                  <Plus className="w-5 h-5" />
                  Nova Comanda
                </Button>
              }
            />
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold uppercase tracking-wider">Abrir Nova Comanda</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Mesa ou Nome do Cliente</label>
                  <Input 
                    placeholder="Ex: Mesa 05 ou João Silva" 
                    className="h-12 bg-background border-border"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsNewOrderOpen(false)} className="font-bold uppercase tracking-widest">Cancelar</Button>
                <Button onClick={handleCreateOrder} disabled={!newCustomerName.trim()} className="font-bold uppercase tracking-widest">Confirmar</Button>
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
          <OrderCard key={`${order.id}-${idx}`} order={order} products={products} viewMode={viewMode} />
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

const OrderCard: React.FC<{ order: Order; products: Product[]; viewMode: 'grid' | 'list' }> = ({ order, products, viewMode }) => {
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isRemoveItemConfirmOpen, setIsRemoveItemConfirmOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

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

    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: newItems,
        totalAmount: newTotal
      });
      toast.success(`Adicionado: ${product.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    }
  };

  const handleCloseOrder = async () => {
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        status: 'closed',
        closedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, 'transactions'), {
        type: 'income',
        category: 'Vendas',
        amount: order.totalAmount,
        description: `Comanda fechada: ${order.customerName}`,
        date: serverTimestamp(),
        orderId: order.id
      });

      toast.success('Comanda fechada com sucesso');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    }
  };

  const handleDeleteOrder = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    try {
      await deleteDoc(doc(db, 'open_orders', order.id));
      toast.success('Comanda excluída com sucesso');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `open_orders/${order.id}`);
    }
  };

  const handleClearItems = async () => {
    if (order.items.length === 0) return;
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: [],
        totalAmount: 0
      });
      toast.success('Comanda limpa');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    }
  };

  const handleRemoveItem = async () => {
    if (!itemToRemove) return;
    const newItems = order.items.filter(i => i.productId !== itemToRemove);
    const newTotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
    try {
      await updateDoc(doc(db, 'open_orders', order.id), {
        items: newItems,
        totalAmount: newTotal
      });
      toast.success('Item removido');
      setItemToRemove(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `open_orders/${order.id}`);
    }
  };

  return (
    <>
      {viewMode === 'list' ? (
        <div className="group relative bg-card hover:bg-card/80 border border-border rounded-xl p-6 transition-all cursor-pointer flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse" />
              <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg uppercase tracking-wider">{order.customerName}</h3>
                <Badge variant="outline" className="text-[8px] font-bold tracking-widest uppercase border-border bg-white/5">
                  <Clock className="w-3 h-3 mr-1" /> {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'HH:mm') : 'Agora'}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                {order.items.reduce((sum, i) => sum + i.quantity, 0)} ITENS • {order.items.length} PRODUTOS DIFERENTES
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-2xl font-black tracking-tight">
                <span className="text-xs font-bold text-muted-foreground mr-1">R$</span>
                {(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteConfirmOpen(true);
                }}
                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </Button>

              <Dialog open={isAddItemsOpen} onOpenChange={setIsAddItemsOpen}>
                <DialogTrigger
                  render={
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  }
                />
                <DialogContent className="max-w-2xl bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold uppercase tracking-wider">Itens da Comanda: {order.customerName}</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Sacola ({order.items.length})</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsClearConfirmOpen(true)}
                        disabled={order.items.length === 0}
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                      {order.items.map((item, idx) => (
                        <div key={`${order.id}-item-${item.productId}-${idx}`} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 group/item">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-primary/20 text-primary border-none">{item.quantity}x</Badge>
                            <span className="font-bold text-sm uppercase">{item.productName}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-sm">R$ {(item.subtotal || 0).toFixed(2)}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setItemToRemove(item.productId);
                                setIsRemoveItemConfirmOpen(true);
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {order.items.length === 0 && (
                        <p className="text-center py-8 text-muted-foreground italic">Nenhum item adicionado</p>
                      )}
                    </div>

                    <div className="border-t border-border pt-6">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-4">Adicionar Produtos</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-1">
                        {products.filter(p => p.active !== false).map((product, pIdx) => (
                          <Button 
                            key={`order-add-prod-${product.id}-${pIdx}`} 
                            variant="ghost" 
                            className="h-auto flex-col items-start p-3 border border-border hover:border-primary hover:bg-primary/5 transition-all"
                            onClick={() => handleAddItem(product)}
                          >
                            <span className="font-bold text-xs uppercase text-left line-clamp-1">{product.name}</span>
                            <span className="text-[10px] text-muted-foreground">R$ {(product.price || 0).toFixed(2)}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="flex items-center justify-between sm:justify-between w-full border-t border-border pt-6">
                    <div className="text-left">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Total da Comanda</p>
                      <p className="text-2xl font-black text-primary">R$ {(order.totalAmount || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setIsAddItemsOpen(false)} className="font-bold uppercase tracking-widest">Voltar</Button>
                      <Button 
                        onClick={handleCloseOrder} 
                        disabled={order.items.length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-widest"
                      >
                        Fechar Comanda
                      </Button>
                    </div>
                  </DialogFooter>
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
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground font-bold">
                  {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'HH:mm') : 'Agora'}
                </p>
                <Button 
                  variant="ghost" 
                  size="icon" 
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
    </>
  );
}

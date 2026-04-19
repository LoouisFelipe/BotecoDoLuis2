import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, limit, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { Transaction, UserProfile, Customer, Order } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarUI } from './ui/calendar';
import { Plus, TrendingUp, TrendingDown, Receipt, Calendar, ArrowUpRight, ArrowDownRight, Filter, X, Users, ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format, isToday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';

export function Finances({ user, setActiveTab }: { user: UserProfile, setActiveTab: (tab: string) => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFiadoModalOpen, setIsFiadoModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [relatedOrder, setRelatedOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Date filter states
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  useEffect(() => {
    if (selectedTransaction?.orderId) {
      const fetchOrder = async () => {
        try {
          console.log("Fetching related order details for:", selectedTransaction.orderId);
          const orderDoc = await getDoc(doc(db, 'closed_orders', selectedTransaction.orderId!));
          if (orderDoc.exists()) {
            console.log("Found order in closed_orders");
            setRelatedOrder({ ...orderDoc.data(), id: orderDoc.id } as Order);
          } else {
            console.log("Order not found in closed_orders, checking open_orders...");
            const openOrderDoc = await getDoc(doc(db, 'open_orders', selectedTransaction.orderId!));
            if (openOrderDoc.exists()) {
              console.log("Found order in open_orders");
              setRelatedOrder({ ...openOrderDoc.data(), id: openOrderDoc.id } as Order);
            } else {
              console.warn("Order not found in either collection");
            }
          }
        } catch (error) {
          console.error("Error fetching related order details:", error);
          if (error instanceof Error) {
             console.error("Error Message:", error.message);
          }
        }
      };
      fetchOrder();
    } else {
      setRelatedOrder(null);
    }
  }, [selectedTransaction]);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(500));
    const qExpenses = query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(500));
    const qCustomers = query(collection(db, 'customers'));

    let transData: Transaction[] = [];
    let expData: Transaction[] = [];

    const updateMerged = () => {
      const merged = [...transData, ...expData].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
        return dateB - dateA;
      }).slice(0, 500);
      setTransactions(merged);
    };

    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      transData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      updateMerged();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      expData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'expense' } as Transaction));
      updateMerged();
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'expenses'));

    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    return () => {
      unsubTransactions();
      unsubExpenses();
      unsubCustomers();
    };
  }, []);

  const handleAddExpense = async () => {
    if (!amount || !category) return;
    setIsSaving(true);
    try {
      // Write to 'expenses' collection to match user's Firestore structure
      await addDoc(collection(db, 'expenses'), {
        category,
        amount: parseFloat(amount),
        description,
        date: serverTimestamp()
      });
      setIsExpenseModalOpen(false);
      setAmount('');
      setCategory('');
      setDescription('');
      toast.success('Despesa registrada');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
    } finally {
      setIsSaving(false);
    }
  };

  const dateFilteredTransactions = transactions.filter(t => {
    if (dateFilter !== 'all') {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(0);
      switch (dateFilter) {
        case 'today': return isToday(tDate);
        case 'week': return isThisWeek(tDate, { weekStartsOn: 0 });
        case 'month': return isThisMonth(tDate);
        case 'custom':
          if (startDate && endDate) {
            const start = startOfDay(startDate);
            const end = endOfDay(endDate);
            return isWithinInterval(tDate, { start, end });
          }
          return true; // show all if custom dates are incomplete
      }
    }
    return true;
  });

  const totalIncome = dateFilteredTransactions
    .filter(t => t.type === 'income' && !(t as any).isFiado)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const totalExpense = dateFilteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalFiado = customers.reduce((sum, c) => sum + Math.abs(Math.min(0, c.balance || 0)), 0);

  const filteredTransactions = dateFilteredTransactions.filter(t => {
    if (typeFilter === 'all') return true;
    return t.type === typeFilter;
  });

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Hoje';
      case 'week': return 'Nesta Semana';
      case 'month': return 'Neste Mês';
      case 'custom': return 'Período Personalizado';
      default: return 'Últimas transações';
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className={cn(
            "border-border bg-card/50 rounded-2xl overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
            typeFilter === 'income' && "ring-2 ring-green-500/50 bg-green-500/5"
          )}
          onClick={() => setTypeFilter(typeFilter === 'income' ? 'all' : 'income')}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Entradas Recentes</p>
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-green-500">
              <span className="text-sm font-bold mr-1">R$</span>
              {totalIncome.toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold tracking-widest uppercase">{getFilterLabel()}</p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "border-border bg-card/50 rounded-2xl overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
            typeFilter === 'expense' && "ring-2 ring-red-500/50 bg-red-500/5"
          )}
          onClick={() => setTypeFilter(typeFilter === 'expense' ? 'all' : 'expense')}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Saídas Recentes</p>
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-red-500">
              <span className="text-sm font-bold mr-1">R$</span>
              {totalExpense.toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold tracking-widest uppercase">{getFilterLabel()}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-primary rounded-2xl overflow-hidden group">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/70">Saldo do Período</p>
              <div className="p-2 rounded-lg bg-white/10 text-white">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-white">
              <span className="text-sm font-bold mr-1">R$</span>
              {(totalIncome - totalExpense).toFixed(2)}
            </div>
            <p className="text-[10px] text-white/70 mt-1 font-bold tracking-widest uppercase">Fluxo de Caixa</p>
          </CardContent>
        </Card>

        <Card 
          className="border-border bg-[#0d1117] border-orange-500/20 rounded-2xl overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => setIsFiadoModalOpen(true)}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold tracking-widest uppercase text-orange-500">Fiado Pendente</p>
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-orange-500">
              <span className="text-sm font-bold mr-1">R$</span>
              {totalFiado.toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold tracking-widest uppercase">Contas a Receber</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-white/5 p-2 rounded-lg">
            <Receipt className="text-primary w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base md:text-lg uppercase tracking-wider">Histórico de Transações</h3>
            <p className="text-[9px] md:text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">Monitoramento Financeiro</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
            <Select value={dateFilter} onValueChange={(val: any) => setDateFilter(val)}>
              <SelectTrigger className="w-full md:w-[180px] h-12 md:h-14 px-4 md:px-6 rounded-xl gap-2 md:gap-3 font-bold tracking-widest uppercase border-border hover:bg-white/5 text-[10px] md:text-sm bg-card/50">
                <Filter className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1224] border-border">
                <SelectItem value="all" className="uppercase font-bold tracking-widest text-xs">Todos</SelectItem>
                <SelectItem value="today" className="uppercase font-bold tracking-widest text-xs">Hoje</SelectItem>
                <SelectItem value="week" className="uppercase font-bold tracking-widest text-xs">Semana</SelectItem>
                <SelectItem value="month" className="uppercase font-bold tracking-widest text-xs">Mês</SelectItem>
                <SelectItem value="custom" className="uppercase font-bold tracking-widest text-xs">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
              <div className="flex gap-2 w-full md:w-auto">
                <Popover>
                  <PopoverTrigger 
                    render={
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-12 md:h-14 md:w-[150px] justify-start text-left font-normal bg-card/50 border-border text-xs md:text-sm uppercase tracking-wider",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy') : <span>Data inicial</span>}
                      </Button>
                    } 
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => setStartDate(date as Date)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger 
                    render={
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-12 md:h-14 md:w-[150px] justify-start text-left font-normal bg-card/50 border-border text-xs md:text-sm uppercase tracking-wider",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy') : <span>Data final</span>}
                      </Button>
                    } 
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => setEndDate(date as Date)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
            <DialogTrigger
              nativeButton={true}
              render={
                <Button className="flex-1 md:flex-none h-12 md:h-14 px-4 md:px-8 rounded-xl gap-2 md:gap-3 font-bold tracking-widest uppercase bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 text-[10px] md:text-sm">
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  Nova Despesa
                </Button>
              }
            />
            <DialogContent className="bg-[#0b1224] border-border max-w-lg text-white p-0 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
              <div className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <TrendingDown className="w-5 h-5 md:w-7 md:h-7 text-red-500" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">Nova Despesa</DialogTitle>
                    <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-red-500/60 flex items-center gap-2">
                      <ArrowDownRight className="w-3 h-3" /> Registro de saída financeira
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsExpenseModalOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Valor (R$)</label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      className="h-12 bg-background border-border font-black"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Categoria</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 bg-background border-border font-bold uppercase tracking-widest text-[10px]">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0b1224] border-border">
                        <SelectItem value="Suprimentos" className="uppercase font-bold tracking-widest text-xs">Suprimentos</SelectItem>
                        <SelectItem value="Aluguel" className="uppercase font-bold tracking-widest text-xs">Aluguel</SelectItem>
                        <SelectItem value="Utilidades" className="uppercase font-bold tracking-widest text-xs">Utilidades</SelectItem>
                        <SelectItem value="Salários" className="uppercase font-bold tracking-widest text-xs">Salários</SelectItem>
                        <SelectItem value="Manutenção" className="uppercase font-bold tracking-widest text-xs">Manutenção</SelectItem>
                        <SelectItem value="Outros" className="uppercase font-bold tracking-widest text-xs">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Descrição</label>
                  <Input 
                    className="h-12 bg-background border-border"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Reposição de Cerveja"
                  />
                </div>
              </div>
              <DialogFooter className="p-6 md:p-8 border-t border-border/50 bg-card flex-shrink-0">
                <Button variant="ghost" onClick={() => setIsExpenseModalOpen(false)} disabled={isSaving} className="font-bold uppercase tracking-widest text-xs">Cancelar</Button>
                <Button onClick={handleAddExpense} disabled={isSaving} className="h-12 px-8 bg-red-600 hover:bg-red-700 font-bold uppercase tracking-widest text-xs">
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </div>
                  ) : 'Salvar Despesa'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border bg-card/50 rounded-2xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Data</TableHead>
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Categoria</TableHead>
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Descrição</TableHead>
                <TableHead className="text-right text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((t, idx) => (
                <TableRow 
                  key={`${t.id}-${idx}`} 
                  className="border-border hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedTransaction(t)}
                >
                  <TableCell className="py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {t.date?.toDate ? format(t.date.toDate(), 'dd MMM, HH:mm') : '...'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={t.type === 'income' ? 'outline' : 'destructive'} 
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest border-none",
                        t.type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}
                    >
                      {t.type === 'income' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-xs uppercase tracking-widest">{t.category}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm font-medium">{t.description}</TableCell>
                  <TableCell className={cn(
                    "text-right font-mono font-bold text-lg",
                    ((t.type === 'income' ? t.amount : -t.amount) || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {((t.type === 'income' ? t.amount : -t.amount) || 0) >= 0 ? '+' : '-'} R$ {Math.abs(t.amount || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-border/50">
          {filteredTransactions.map((t, idx) => (
            <div 
              key={`mobile-trans-${t.id}-${idx}`} 
              className="p-4 space-y-3 cursor-pointer active:bg-white/5"
              onClick={() => setSelectedTransaction(t)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t.date?.toDate ? format(t.date.toDate(), 'dd MMM, HH:mm') : '...'}
                  </p>
                  <h4 className="font-bold text-sm uppercase tracking-wider">{t.category}</h4>
                </div>
                <Badge 
                  variant={t.type === 'income' ? 'outline' : 'destructive'} 
                  className={cn(
                    "text-[8px] font-bold uppercase tracking-widest border-none",
                    t.type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}
                >
                  {t.type === 'income' ? 'Entrada' : 'Saída'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{t.description}</p>
              <div className="flex justify-end">
                <p className={cn(
                  "font-mono font-bold text-base",
                  ((t.type === 'income' ? t.amount : -t.amount) || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {((t.type === 'income' ? t.amount : -t.amount) || 0) >= 0 ? '+' : '-'} R$ {Math.abs(t.amount || 0).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-24 text-muted-foreground">
            <Receipt className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="font-bold tracking-widest uppercase">Nenhuma transação registrada</p>
          </div>
        )}
      </Card>

      {/* Fiado Details Modal */}
      <Dialog open={isFiadoModalOpen} onOpenChange={setIsFiadoModalOpen}>
        <DialogContent className="bg-[#0b1224] border-border max-w-2xl text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Users className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">Fiado Pendente</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-orange-500/60 flex items-center gap-2">
                  <TrendingDown className="w-3 h-3" /> Clientes com saldo devedor
                </p>
              </div>
            </div>
            <button onClick={() => setIsFiadoModalOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="space-y-4">
              {customers.filter(c => (c.balance || 0) < 0).length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-border">
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Nenhum fiado pendente</p>
                </div>
              ) : (
                customers
                  .filter(c => (c.balance || 0) < 0)
                  .sort((a, b) => (a.balance || 0) - (b.balance || 0))
                  .map((customer) => (
                    <div 
                      key={customer.id} 
                      className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-border/50 hover:border-orange-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm uppercase tracking-wider">{customer.name}</h4>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{customer.phone || 'Sem telefone'}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Saldo Devedor</p>
                          <p className="font-mono font-bold text-orange-500 text-lg">R$ {Math.abs(customer.balance || 0).toFixed(2)}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setIsFiadoModalOpen(false);
                            setActiveTab('clients');
                          }}
                          className="hover:bg-orange-500/10 hover:text-orange-500"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Modal */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="bg-[#0b1224] border-border max-w-lg text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border",
                selectedTransaction?.type === 'income' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
              )}>
                {selectedTransaction?.type === 'income' ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
              </div>
              <div>
                <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">Detalhes da Transação</DialogTitle>
                <p className={cn(
                  "text-[10px] font-bold tracking-widest uppercase flex items-center gap-2",
                  selectedTransaction?.type === 'income' ? "text-green-500/60" : "text-red-500/60"
                )}>
                  {selectedTransaction?.type === 'income' ? 'Entrada de Caixa' : 'Saída de Caixa'}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedTransaction(null)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data e Hora</p>
                <p className="font-bold text-sm uppercase">
                  {selectedTransaction?.date?.toDate ? format(selectedTransaction.date.toDate(), 'dd/MM/yyyy HH:mm:ss') : '...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Categoria</p>
                <p className="font-bold text-sm uppercase">{selectedTransaction?.category}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Método de Pagamento</p>
                <p className="font-bold text-sm uppercase">{selectedTransaction?.paymentMethod || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Valor Total</p>
                <p className={cn(
                  "font-mono font-bold text-xl",
                  (selectedTransaction ? (selectedTransaction.type === 'income' ? selectedTransaction.amount : -selectedTransaction.amount) : 0) >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {(selectedTransaction ? (selectedTransaction.type === 'income' ? selectedTransaction.amount : -selectedTransaction.amount) : 0) >= 0 ? '+' : '-'} R$ {Math.abs(selectedTransaction?.amount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Descrição / Observações</p>
              <div className="p-4 bg-white/5 rounded-xl border border-border/50 text-sm leading-relaxed">
                {selectedTransaction?.description || 'Nenhuma descrição informada.'}
              </div>
            </div>

            {selectedTransaction?.orderId && (
              <div className="space-y-4">
                <div className="h-px bg-border/50" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Itens da Comanda</p>
                {relatedOrder ? (
                  <div className="space-y-2">
                    {relatedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-border/30">
                        <div>
                          <p className="text-xs font-bold uppercase">{item.productName}</p>
                          <p className="text-[10px] text-muted-foreground">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                        </div>
                        <p className="text-xs font-mono font-bold">R$ {item.subtotal.toFixed(2)}</p>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs border-border hover:bg-white/5 mt-4"
                      onClick={() => {
                        setSelectedTransaction(null);
                        setActiveTab('dashboard');
                      }}
                    >
                      Ver Comanda Completa
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

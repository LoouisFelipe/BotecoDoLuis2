import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { Transaction, UserProfile, Customer } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, TrendingUp, TrendingDown, Receipt, Calendar, ArrowUpRight, ArrowDownRight, Filter, X, Users } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';

export function Finances({ user }: { user: UserProfile }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(50));
    const qExpenses = query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(50));
    const qCustomers = query(collection(db, 'customers'));

    let transData: Transaction[] = [];
    let expData: Transaction[] = [];

    const updateMerged = () => {
      const merged = [...transData, ...expData].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
        return dateB - dateA;
      }).slice(0, 50);
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

  const totalIncome = transactions
    .filter(t => t.type === 'income' && !(t as any).isFiado)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalFiado = customers.reduce((sum, c) => sum + Math.abs(Math.min(0, c.balance || 0)), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border bg-card/50 rounded-2xl overflow-hidden group">
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
            <p className="text-[10px] text-muted-foreground mt-1 font-bold tracking-widest uppercase">Últimas 50 transações</p>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card/50 rounded-2xl overflow-hidden group">
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
            <p className="text-[10px] text-muted-foreground mt-1 font-bold tracking-widest uppercase">Últimas 50 transações</p>
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

        <Card className="border-border bg-[#0d1117] border-orange-500/20 rounded-2xl overflow-hidden group">
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

        <div className="flex flex-row gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-12 md:h-14 px-4 md:px-6 rounded-xl gap-2 md:gap-3 font-bold tracking-widest uppercase border-border hover:bg-white/5 text-[10px] md:text-sm">
            <Filter className="w-4 h-4 md:w-5 md:h-5" />
            Filtrar
          </Button>

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
              {transactions.map((t, idx) => (
                <TableRow key={`${t.id}-${idx}`} className="border-border hover:bg-white/5 transition-colors">
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
                    t.type === 'income' ? 'text-green-500' : 'text-red-500'
                  )}>
                    {t.type === 'income' ? '+' : '-'} R$ {(t.amount || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-border/50">
          {transactions.map((t, idx) => (
            <div key={`mobile-trans-${t.id}-${idx}`} className="p-4 space-y-3">
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
                  t.type === 'income' ? 'text-green-500' : 'text-red-500'
                )}>
                  {t.type === 'income' ? '+' : '-'} R$ {(t.amount || 0).toFixed(2)}
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
    </div>
  );
}

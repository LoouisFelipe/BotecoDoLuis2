import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Transaction, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, TrendingUp, TrendingDown, Receipt, Calendar, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';

export function Finances({ user }: { user: UserProfile }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    return () => unsubscribe();
  }, []);

  const handleAddExpense = async () => {
    if (!amount || !category) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        type: 'expense',
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
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-white/5 p-2 rounded-lg">
            <Receipt className="text-primary w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg uppercase tracking-wider">Histórico de Transações</h3>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">Monitoramento Financeiro</p>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <Button variant="outline" className="h-14 px-6 rounded-xl gap-3 font-bold tracking-widest uppercase border-border hover:bg-white/5">
            <Filter className="w-5 h-5" />
            Filtrar
          </Button>

          <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
            <DialogTrigger
              nativeButton={true}
              render={
                <Button className="h-14 px-8 rounded-xl gap-3 font-bold tracking-widest uppercase bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20">
                  <Plus className="w-5 h-5" />
                  Nova Despesa
                </Button>
              }
            />
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold uppercase tracking-wider">Registrar Despesa</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Valor (R$)</label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      className="h-12 bg-background border-border"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Categoria</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 bg-background border-border">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
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
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Descrição</label>
                  <Input 
                    className="h-12 bg-background border-border"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Reposição de Cerveja"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsExpenseModalOpen(false)} className="font-bold uppercase tracking-widest">Cancelar</Button>
                <Button onClick={handleAddExpense} className="bg-red-600 hover:bg-red-700 font-bold uppercase tracking-widest">Salvar Despesa</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border bg-card/50 rounded-2xl overflow-hidden">
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
            {transactions.map(t => (
              <TableRow key={t.id} className="border-border hover:bg-white/5 transition-colors">
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
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-24 text-muted-foreground">
                  <Receipt className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-bold tracking-widest uppercase">Nenhuma transação registrada</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

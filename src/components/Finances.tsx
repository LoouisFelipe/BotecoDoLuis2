import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, addDoc, serverTimestamp, orderBy, limit, getDocs, where, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Transaction, UserProfile, Customer, Order, ExpenseCategory, RecurringExpense, InstallmentExpense } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarUI } from './ui/calendar';
import { Plus, TrendingUp, TrendingDown, Receipt, Calendar, ArrowUpRight, ArrowDownRight, Filter, X, Users, ChevronRight, Settings2, Trash2, Info, CreditCard, Banknote, Smartphone, Wallet, QrCode, Zap, MoreHorizontal, Search, Package, Target } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { isToday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay, addMonths } from 'date-fns';
import { format } from '../lib/utils';
import { ptBR } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn, getShiftInterval, formatShiftDateTime, parseAsSaoPaulo, getSaoPauloDate, nowInSaoPaulo } from '../lib/utils';
import { DateRangePicker } from './DateRangePicker';

import { useData } from '../contexts/DataContext';
import { usePaymentFees } from '../hooks/usePaymentFees';
import { useNavigate } from 'react-router-dom';

const PAYMENT_METHODS = [
  { id: 'pix', label: 'Pix', icon: QrCode, color: 'text-cyan-400' },
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-emerald-400' },
  { id: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: 'text-blue-400' },
  { id: 'cartao_debito', label: 'Débito', icon: CreditCard, color: 'text-indigo-400' },
  { id: 'fiado', label: 'Fiado', icon: Users, color: 'text-orange-400' },
];

export function Finances({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const { calculateNet } = usePaymentFees();
  const { 
    customers, 
    expenseCategories, 
    transactions: rawTransactions,
    expenses: rawExpenses,
    purchases: rawPurchases,
    recurringExpenses,
    installmentExpenses,
    loading 
  } = useData();

  const transactions = React.useMemo(() => {
    const combined = [
      ...rawTransactions.map(t => ({ ...t, source: 'transactions' })),
      ...rawExpenses.map(t => ({ ...t, source: 'expenses' })),
      ...rawPurchases.map(p => ({
        id: p.id,
        date: p.date,
        amount: p.totalAmount,
        type: 'expense' as const,
        category: 'Compra de Estoque',
        description: `Compra: ${p.supplierName || 'Fornecedor'}`,
        paymentMethod: p.paymentMethod || 'Dinheiro',
        purchaseId: p.id,
        source: 'purchases',
        status: p.status
      }))
    ];

    return combined
      .filter(t => (t as any).status !== 'deleted')
      .map(t => {
        const date = parseAsSaoPaulo(t.date);
        return { ...t, date };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawTransactions, rawExpenses, rawPurchases]);

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFiadoModalOpen, setIsFiadoModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [relatedOrder, setRelatedOrder] = useState<Order | null>(null);
  const [relatedPurchase, setRelatedPurchase] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDeleteTransaction = async (e: React.MouseEvent, id: string, source: string) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      await updateDoc(doc(db, source === 'transactions' ? 'transactions' : source === 'purchases' ? 'purchases' : 'expenses', id), {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        deletedBy: user.uid
      });
      toast.success('Registro excluído com sucesso');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, source);
    }
  };

  useEffect(() => {
    if (selectedTransaction?.orderId) {
      const fetchOrder = async () => {
        try {
          const orderDoc = await getDoc(doc(db, 'closed_orders', selectedTransaction.orderId!));
          if (orderDoc.exists()) {
            setRelatedOrder({ ...orderDoc.data(), id: orderDoc.id } as Order);
          } else {
            const openOrderDoc = await getDoc(doc(db, 'open_orders', selectedTransaction.orderId!));
            if (openOrderDoc.exists()) {
              setRelatedOrder({ ...openOrderDoc.data(), id: openOrderDoc.id } as Order);
            }
          }
        } catch (error) {
          console.error("Error fetching related order details:", error);
        }
      };
      fetchOrder();
    } else {
      setRelatedOrder(null);
    }

    if (selectedTransaction?.purchaseId) {
      const fetchPurchase = async () => {
        try {
          const purchaseDoc = await getDoc(doc(db, 'purchases', selectedTransaction.purchaseId!));
          if (purchaseDoc.exists()) {
            setRelatedPurchase({ ...purchaseDoc.data(), id: purchaseDoc.id });
          }
        } catch (error) {
          console.error("Error fetching related purchase details:", error);
        }
      };
      fetchPurchase();
    } else {
      setRelatedPurchase(null);
    }
  }, [selectedTransaction]);
  
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getShiftDate());
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState('3');
  const [dueDate, setDueDate] = useState('5');

  const [metasView, setMetasView] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const handleAddExpense = async () => {
    if (!amount || !category) return;
    setIsSaving(true);
    try {
      const selectedCat = expenseCategories.find(c => c.id === category);
      
      if (isRecurring) {
        await addDoc(collection(db, 'recurring_expenses'), {
          description,
          amount: parseFloat(amount),
          dueDate: parseInt(dueDate),
          categoryId: category,
          subCategory,
          active: true,
          createdAt: serverTimestamp()
        });
        toast.success('Despesa recorrente agendada');
      } else if (isInstallment) {
        const total = parseFloat(amount);
        const count = parseInt(installmentsCount);
        const installmentValue = total / count;
        
        await addDoc(collection(db, 'installment_expenses'), {
          description,
          totalAmount: total,
          remainingAmount: total - (total / count),
          installmentsCount: count,
          remainingInstallments: count - 1,
          installmentValue: installmentValue,
          nextDueDate: addMonths(nowInSaoPaulo(), 1),
          categoryId: category,
          subCategory,
          createdAt: serverTimestamp(),
          active: true
        });
        
        await addDoc(collection(db, 'expenses'), {
          categoryId: category,
          subCategory,
          category: selectedCat?.name || category,
          amount: installmentValue,
          description: `${description} (Entrada/Parcela 1/${count})`,
          date: nowInSaoPaulo() // Always use São Paulo for current entry
        });
        
        toast.success('Compra parcelada registrada');
      } else {
        await addDoc(collection(db, 'expenses'), {
          categoryId: category,
          subCategory,
          category: selectedCat?.name || category,
          amount: parseFloat(amount),
          description,
          date: parseAsSaoPaulo(expenseDate) // Use utility to parse the selected date correctly
        });
        toast.success('Despesa registrada');
      }
      
      setIsExpenseModalOpen(false);
      setAmount('');
      setCategory('');
      setSubCategory('');
      setDescription('');
      setIsRecurring(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, isRecurring ? 'recurring_expenses' : 'expenses');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchQuery && !t.description?.toLowerCase().includes(searchQuery.toLowerCase()) && !t.category?.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      const tDate = t.date;
      if (!tDate) return true;

      if (dateFilter === 'today') {
        const { start, end } = getShiftInterval();
        return isWithinInterval(tDate, { start, end });
      }
      if (dateFilter === 'week') return isThisWeek(tDate, { weekStartsOn: 0 });
      if (dateFilter === 'month') return isThisMonth(tDate);
      if (dateFilter === 'custom' && startDate && endDate) {
        return isWithinInterval(tDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
      }
      return true;
    });
  }, [transactions, typeFilter, dateFilter, startDate, endDate, methodFilter, categoryFilter, searchQuery]);

  const groupedTransactions = React.useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredTransactions.forEach(t => {
      const shiftDate = getShiftDate(t.date);
      const dateKey = shiftDate ? `Expediente ${format(parseAsSaoPaulo(shiftDate), 'dd/MM/yyyy')}` : 'Data Indefinida';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const incomeTransactions = filteredTransactions.filter(t => t.type === 'income' && !t.isFiado);
  const totalGrossIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalFees = incomeTransactions.reduce((sum, t) => {
    if (t.feeAmount !== undefined && t.feeAmount > 0) return sum + t.feeAmount;
    return sum + calculateNet(t.amount, t.paymentMethod).feeAmount;
  }, 0);
  const totalNetIncome = incomeTransactions.reduce((sum, t) => {
    const fee = t.feeAmount !== undefined && t.feeAmount > 0 ? t.feeAmount : calculateNet(t.amount, t.paymentMethod).feeAmount;
    return sum + (t.amount - fee);
  }, 0);
  const totalCostOfGoods = incomeTransactions.reduce((sum, t) => sum + (t.cost || 0), 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
  const realNetProfit = totalNetIncome - totalCostOfGoods - totalExpense;
  const totalFiado = customers.reduce((sum, c) => sum + Math.abs(Math.min(0, c.balance || 0)), 0);

  // Financial Health Calculation
  const totalFixedCosts = React.useMemo(() => {
    const recurring = recurringExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const installments = installmentExpenses.reduce((sum, e) => sum + (e.installmentValue || 0), 0);
    const monthlyTotal = recurring + installments;

    // Scale based on selected period
    if (dateFilter === 'today') return monthlyTotal / 30;
    if (dateFilter === 'week') return (monthlyTotal / 30) * 7;
    if (dateFilter === 'custom' && startDate && endDate) {
      const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      return (monthlyTotal / 30) * days;
    }
    return monthlyTotal; // Default to month
  }, [recurringExpenses, installmentExpenses, dateFilter, startDate, endDate]);

  const totalNeeded = totalFixedCosts + totalExpense + totalFees;
  const breakEvenProgress = totalGrossIncome > 0 ? Math.min(100, (totalGrossIncome / totalNeeded) * 100) : 0;

  // Trend Calculation
  const trendStats = React.useMemo(() => {
    let prevStart: Date;
    let prevEnd: Date;
    const now = nowInSaoPaulo();

    if (dateFilter === 'today') {
      prevStart = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      prevEnd = endOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    } else if (dateFilter === 'week') {
      prevStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === 'month') {
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      return { grossTrend: 0, profitTrend: 0 };
    }

    const prevTrans = transactions.filter(t => t.date >= prevStart && t.date <= prevEnd);
    const prevIncome = prevTrans.filter(t => t.type === 'income' && !t.isFiado);
    const prevGross = prevIncome.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const prevNetInc = prevIncome.reduce((sum, t) => {
      const fee = t.feeAmount !== undefined && t.feeAmount > 0 ? t.feeAmount : calculateNet(t.amount, t.paymentMethod).feeAmount;
      return sum + (t.amount - fee);
    }, 0);
    const prevExp = prevTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const prevCOGS = prevIncome.reduce((sum, t) => sum + (t.cost || 0), 0);
    const prevProfit = prevNetInc - prevCOGS - prevExp;

    const calcTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      grossTrend: calcTrend(totalGrossIncome, prevGross),
      profitTrend: calcTrend(realNetProfit, prevProfit)
    };
  }, [transactions, dateFilter, totalGrossIncome, realNetProfit, calculateNet]);

  const getPaymentMethodIcon = (method: string) => {
    const m = method?.toLowerCase();
    if (m?.includes('pix')) return <QrCode className="w-4 h-4" />;
    if (m?.includes('dinheiro')) return <Banknote className="w-4 h-4" />;
    if (m?.includes('crédito') || m?.includes('credito')) return <CreditCard className="w-4 h-4" />;
    if (m?.includes('débito') || m?.includes('debito')) return <CreditCard className="w-4 h-4" />;
    if (m?.includes('fiado')) return <Users className="w-4 h-4" />;
    return <Wallet className="w-4 h-4" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card 
          className={cn(
            "bg-[#0b1224] border-white/10 overflow-hidden relative group cursor-pointer transition-all rounded-[40px] h-[200px] hover:border-green-500/30 shadow-2xl",
            typeFilter === 'income' && "ring-2 ring-green-500/50 bg-green-500/10"
          )}
          onClick={() => setTypeFilter(typeFilter === 'income' ? 'all' : 'income')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)] group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-green-500" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-green-500/50 uppercase tracking-widest">Tendência</p>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-black font-mono",
                  trendStats.grossTrend >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {trendStats.grossTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(trendStats.grossTrend).toFixed(1)}%
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground mb-2 leading-none">Faturamento Bruto</p>
              <h3 className="text-3xl font-black text-white leading-none font-mono tracking-tighter tabular-nums">
                R$ {(totalGrossIncome || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "bg-[#0b1224] border-white/10 overflow-hidden relative group cursor-pointer transition-all rounded-[40px] h-[200px] hover:border-red-500/30 shadow-2xl",
            typeFilter === 'expense' && "ring-2 ring-red-500/50 bg-red-500/10"
          )}
          onClick={() => setTypeFilter(typeFilter === 'expense' ? 'all' : 'expense')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)] group-hover:scale-110 transition-transform">
                <TrendingDown className="w-7 h-7 text-red-500" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-red-500/50 uppercase tracking-widest">Margem Bruta</p>
                <p className="text-sm font-black text-red-500 font-mono">
                  {totalGrossIncome > 0 ? ((totalNetIncome / totalGrossIncome) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground mb-2 leading-none">Total de Saídas</p>
              <h3 className="text-3xl font-black text-red-500 leading-none font-mono tracking-tighter tabular-nums">
                R$ {(totalExpense + totalCostOfGoods + totalFees).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/90 border-primary overflow-hidden relative group rounded-[40px] h-[200px] shadow-2xl shadow-primary/30">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
          <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Tendência de Lucro</p>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-black font-mono text-white",
                )}>
                  {trendStats.profitTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(trendStats.profitTrend).toFixed(1)}%
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/70 mb-2 leading-none">Lucro Líquido Real</p>
              <h3 className="text-3xl font-black text-white leading-none font-mono tracking-tighter tabular-nums">
                R$ {realNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/30 border-border/50 overflow-hidden relative group cursor-pointer transition-all rounded-[40px] h-[200px] hover:border-orange-500/30 shadow-2xl"
          onClick={() => setIsFiadoModalOpen(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.2)] group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-orange-500" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-orange-500/50 uppercase tracking-widest">Taxas Operacionais</p>
                <p className="text-sm font-black text-orange-500 font-mono">
                  R$ {totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground mb-2 leading-none">Fiado Pendente</p>
              <h3 className="text-3xl font-black text-orange-500 leading-none font-mono tracking-tighter tabular-nums">
                R$ {totalFiado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Indicator Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="md:col-span-2 bg-[#0b1224] border-white/10 rounded-[40px] overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-widest text-sm">Ponto de Equilíbrio & Saúde</h4>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Meta de faturamento vs Custos Fixos</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-white">{breakEvenProgress.toFixed(1)}%</span>
                <p className="text-[9px] font-black text-primary uppercase tracking-tighter">ALCANÇADO</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-1000 ease-out"
                  style={{ width: `${breakEvenProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Custos Fixos (Recorrência)</p>
                  <p className="text-white font-mono">R$ {totalFixedCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-muted-foreground">Outras Saídas</p>
                  <p className="text-white font-mono">R$ {(totalExpense + totalFees).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-muted-foreground">Faturamento Necessário</p>
                  <p className="text-primary font-mono font-black">R$ {totalNeeded.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0b1224] border-white/10 rounded-[40px] overflow-hidden flex flex-col justify-center p-8 relative">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status de Operação</p>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  realNetProfit > 0 ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                )} />
                <span className="font-black uppercase tracking-tighter text-lg">
                  {realNetProfit > 0 ? 'OPERAÇÃO LUCRATIVA' : 'OPERAÇÃO EM DÉFICIT'}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-bold tracking-tight">
                {realNetProfit > 0 
                  ? "Sua operação está gerando valor líquido positivo após todas as deduções de taxas, CMV e custos fixos."
                  : "O faturamento atual ainda não cobre a soma de custos fixos, variáveis e taxas operacionais."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-card/40 border-border/50 overflow-hidden rounded-[40px] shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-lg leading-tight">Histórico de Transações</h3>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 w-full lg:flex-1 justify-end items-center">
            {/* Quick Filters */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mr-auto">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setDateFilter('today')}
                className={cn(
                  "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  dateFilter === 'today' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                )}
              >
                Hoje
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setDateFilter('week')}
                className={cn(
                  "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  dateFilter === 'week' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                )}
              >
                Semana
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setDateFilter('month')}
                className={cn(
                  "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  dateFilter === 'month' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                )}
              >
                Mês
              </Button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="BUSCAR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 rounded-[24px] text-[10px] font-black tracking-widest uppercase focus:ring-2 focus:ring-primary/50"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px] h-14 px-6 rounded-[24px] bg-card/50 border-white/10">
                <SelectValue placeholder="CATEGORIA" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1224] border-border text-white">
                <SelectItem value="all">TODAS AS CATEGORIAS</SelectItem>
                {expenseCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(val: any) => setDateFilter(val)}>
              <SelectTrigger className="w-full md:w-[160px] h-14 px-6 rounded-[24px] bg-card/50 border-white/10">
                <SelectValue placeholder="PERÍODO" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1224] border-border text-white">
                <SelectItem value="all">TODO O TEMPO</SelectItem>
                <SelectItem value="today">HOJE (EXPEDIENTE)</SelectItem>
                <SelectItem value="week">ESTA SEMANA</SelectItem>
                <SelectItem value="month">ESTE MÊS</SelectItem>
                <SelectItem value="custom">PERSONALIZADO</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
              <DateRangePicker 
                onApply={(range) => {
                  if (range) {
                    setStartDate(range.from);
                    setEndDate(range.to);
                  }
                }}
                initialRange={startDate && endDate ? { from: startDate, to: endDate } : undefined}
                className="w-full md:w-auto h-14"
              />
            )}
            
            <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
              <DialogTrigger asChild>
                <Button className="h-14 px-8 rounded-[24px] bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 font-black uppercase tracking-widest text-xs">
                  <Plus className="w-4 h-4 mr-2" /> Lançar Saída
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0b1224] text-white border-white/10 rounded-[40px] max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Nova Despesa</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Valor</label>
                    <Input type="number" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl font-mono text-lg" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Descrição</label>
                    <Input placeholder="Ex: Pagamento de Frete" value={description} onChange={(e) => setDescription(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl" />
                  </div>
                  <Button onClick={handleAddExpense} className="w-full h-14 bg-red-600 hover:bg-red-700 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-600/20">
                    Confirmar Lançamento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-border">
                <TableHead className="px-8 text-[10px] font-black uppercase text-muted-foreground">Data</TableHead>
                <TableHead className="px-8 text-[10px] font-black uppercase text-muted-foreground">Tipo</TableHead>
                <TableHead className="px-8 text-[10px] font-black uppercase text-muted-foreground">Descrição</TableHead>
                <TableHead className="px-8 text-[10px] font-black uppercase text-muted-foreground text-right">Valor</TableHead>
                <TableHead className="px-8 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="hidden md:table-row-group">
              {groupedTransactions.map(([date, groupTransactions]) => (
                <React.Fragment key={`group-${date}`}>
                  <TableRow className="bg-white/[0.02] border-y border-white/5 pointer-events-none">
                    <TableCell colSpan={5} className="py-2 px-8">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">
                        {date}
                      </span>
                    </TableCell>
                  </TableRow>
                  {groupTransactions.map((t) => (
                    <TableRow 
                      key={t.id} 
                      className="border-border hover:bg-white/5 cursor-pointer group transition-colors"
                      onClick={() => setSelectedTransaction(t)}
                    >
                      <TableCell className="px-8 text-xs font-mono font-bold text-muted-foreground">
                        <div className="flex flex-col">
                          <span className="text-white font-black">{format(t.date, 'HH:mm')}</span>
                          <span className="text-[9px] uppercase tracking-tighter">{format(t.date, 'dd MMM')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-8">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border",
                          t.type === 'income' ? "bg-green-500/10 border-green-500/20 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        )}>
                          {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                      </TableCell>
                      <TableCell className="px-8">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-primary/30 transition-colors",
                            t.paymentMethod === 'Pix' ? "text-cyan-500" : 
                            t.paymentMethod === 'Dinheiro' ? "text-green-500" : 
                            t.paymentMethod === 'Fiado' ? "text-orange-500" : "text-blue-500"
                          )}>
                            {getPaymentMethodIcon(t.paymentMethod)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider text-white group-hover:text-primary transition-colors">
                              {t.category || (t.type === 'income' ? 'Venda' : 'Geral')}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest line-clamp-1">
                              {t.description || 'Sem descrição'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={cn("px-8 text-right")}>
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-base font-mono font-black tabular-nums",
                            t.type === 'income' ? 'text-green-500' : 'text-red-500'
                          )}>
                            {t.type === 'income' ? '+' : '-'} R$ {Math.abs(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {t.type === 'income' && t.paymentMethod && (
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                              {t.paymentMethod} {t.feeAmount > 0 && <span className="text-red-400/70">(-R$ {t.feeAmount.toFixed(2)})</span>}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => handleDeleteTransaction(e, t.id, (t as any).source)} 
                          className="h-10 w-10 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {Object.entries(groupedTransactions).map(([date, transactions]) => (
            <div key={`mobile-group-${date}`} className="contents">
              <div className="bg-primary/5 py-3 px-6 border-y border-white/5">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                  {date}
                </span>
              </div>
              <div className="divide-y divide-white/5">
                {transactions.map((t, idx) => (
                  <div 
                    key={`mobile-trans-${t.id}-${idx}`} 
                    className="p-6 space-y-4 cursor-pointer active:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    onClick={() => setSelectedTransaction(t)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg",
                          t.type === 'income' ? "bg-green-500/10 border-green-500/20 text-green-500 shadow-green-500/5" : "bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/5"
                        )}>
                          {t.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] tabular-nums leading-none mb-1.5">
                            {t.date ? format(t.date, 'HH:mm') : '--:--'}
                          </p>
                          <h4 className="font-black text-base uppercase tracking-widest leading-none text-white">{t.category || (t.type === 'income' ? 'VENDA' : 'GERAL')}</h4>
                        </div>
                      </div>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 shadow-inner",
                        t.paymentMethod === 'Pix' ? "text-cyan-400" : 
                        t.paymentMethod === 'Dinheiro' ? "text-emerald-400" : 
                        t.paymentMethod === 'Fiado' ? "text-orange-400" : "text-blue-400"
                      )}>
                        {getPaymentMethodIcon(t.paymentMethod)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end gap-4 pl-16">
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest line-clamp-2 leading-relaxed">{t.description || 'Sem observações'}</p>
                        {t.subCategory && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <p className="text-[9px] text-primary font-black tracking-widest uppercase">{t.subCategory}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className={cn(
                          "font-mono font-black text-xl leading-none tabular-nums tracking-tighter",
                          t.type === 'income' ? 'text-green-500' : 'text-red-500'
                        )}>
                          {t.type === 'income' ? '+' : '-'} R$ {Math.abs(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {t.type === 'income' && (t.feeAmount || 0) > 0 && (
                          <p className="text-[9px] text-red-400/70 uppercase font-black tracking-widest mt-2 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10">
                            TAXA: R$ {t.feeAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-32 text-muted-foreground">
            <Receipt className="w-16 h-16 mx-auto mb-6 opacity-10 animate-pulse" />
            <p className="font-black tracking-widest uppercase text-xs">Nenhuma transação encontrada</p>
            {(searchQuery || categoryFilter !== 'all' || methodFilter !== 'all') && (
              <Button 
                variant="link" 
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setMethodFilter('all');
                }}
                className="mt-4 text-primary font-bold uppercase tracking-widest text-[10px]"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Fiado Details Modal */}
      <Dialog open={isFiadoModalOpen} onOpenChange={setIsFiadoModalOpen}>
        <DialogContent className="bg-[#0b1224] border-border max-w-2xl text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
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
          </DialogHeader>

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
                            navigate('/clients');
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
          <DialogHeader className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
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
          </DialogHeader>

          <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data e Hora</p>
                <p className="font-bold text-sm uppercase">
                  {selectedTransaction?.date ? formatShiftDateTime(selectedTransaction.date) : '...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Categoria</p>
                <p className="font-bold text-sm uppercase">
                  {selectedTransaction?.subCategory ? `${selectedTransaction.category} > ${selectedTransaction.subCategory}` : selectedTransaction?.category}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Método de Pagamento</p>
                <p className="font-bold text-sm uppercase">{selectedTransaction?.paymentMethod || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Valor Bruto</p>
                <p className={cn(
                  "font-mono font-bold text-xl",
                  (selectedTransaction ? (selectedTransaction.type === 'income' ? selectedTransaction.amount : -selectedTransaction.amount) : 0) >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {(selectedTransaction ? (selectedTransaction.type === 'income' ? selectedTransaction.amount : -selectedTransaction.amount) : 0) >= 0 ? '+' : '-'} R$ {Math.abs(selectedTransaction?.amount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {(() => {
              const displayFee = selectedTransaction?.feeAmount !== undefined && selectedTransaction.feeAmount > 0 
                ? selectedTransaction.feeAmount 
                : (selectedTransaction?.type === 'income' && selectedTransaction.paymentMethod ? calculateNet(selectedTransaction.amount, selectedTransaction.paymentMethod).feeAmount : 0);
              
              const displayNet = selectedTransaction?.netAmount !== undefined && selectedTransaction.netAmount > 0
                ? selectedTransaction.netAmount
                : (selectedTransaction?.amount || 0) - displayFee;

              if (displayFee > 0) {
                return (
                  <div className="grid grid-cols-2 gap-8 border-t border-border/50 pt-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-red-500/80">Taxa do Cartão / Pix</p>
                      <p className="font-mono font-bold text-base text-red-500/80">
                        - R$ {displayFee.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-green-500">Valor Líquido (Recebido)</p>
                      <p className="font-mono font-black text-xl text-green-500">
                        R$ {displayNet.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Descrição / Observações</p>
              <div className="p-4 bg-white/5 rounded-xl border border-border/50 text-sm leading-relaxed">
                {selectedTransaction?.description || 'Nenhuma descrição informada.'}
              </div>
            </div>

            {selectedTransaction?.customerId && (() => {
              const customer = customers.find(c => c.id === selectedTransaction.customerId);
              if (!customer) return null;
              return (
                <div className="space-y-4">
                  <div className="h-px bg-border/50" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Resumo do Cliente</p>
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Users className="w-16 h-16" />
                    </div>
                    <h4 className="font-bold uppercase text-lg mb-1">{customer.name}</h4>
                    {customer.phone && <p className="text-sm text-muted-foreground mb-3">{customer.phone}</p>}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo Conta ('Fiado')</p>
                        <p className={cn(
                          "font-mono font-bold text-sm",
                          (customer.balance || 0) > 0 ? "text-green-500" : (customer.balance || 0) < 0 ? "text-red-500" : "text-white"
                        )}>
                          R$ {(customer.balance || 0).toFixed(2)}
                        </p>
                      </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Gasto Total</p>
                          <p className="font-mono font-bold text-sm text-primary">R$ {(customer.totalSpent || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border-orange-500/10 bg-orange-500/5 hover:bg-orange-500 hover:text-white transition-all mt-6 group"
                      onClick={() => {
                        setSelectedTransaction(null);
                        setActiveTab('clients');
                      }}
                    >
                      Ver Perfil Completo do Cliente
                      <Users className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                    </Button>
                  </div>
              );
            })()}

            {selectedTransaction?.orderId && (
              <div className="space-y-4">
                <div className="h-px bg-border/50" />
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Manifesto da Comanda</p>
                </div>
                {relatedOrder ? (
                  <div className="space-y-2">
                    {relatedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 text-[10px] font-black">
                            {item.quantity}x
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-white group-hover:text-primary transition-colors">{item.productName}</p>
                            <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase">P. Unit: R$ {item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <p className="text-xs font-mono font-black text-white">R$ {item.subtotal.toFixed(2)}</p>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border-white/10 bg-white/5 hover:bg-primary hover:text-white transition-all mt-4 group"
                      onClick={() => {
                        setSelectedTransaction(null);
                        setActiveTab('dashboard');
                      }}
                    >
                      Ver Terminal de Venda
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sincronizando Dados da Comanda...</p>
                  </div>
                )}
              </div>
            )}

            {selectedTransaction?.purchaseId && (
              <div className="space-y-4">
                <div className="h-px bg-border/50" />
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Manifesto de Itens (Estoque)</p>
                </div>
                {relatedPurchase ? (
                  <div className="space-y-2">
                    {relatedPurchase.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 text-[10px] font-black">
                            {item.quantity}x
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-white group-hover:text-green-500 transition-colors">{item.productName}</p>
                            <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase">Custo Unit: R$ {item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <p className="text-xs font-mono font-black text-white">R$ {item.subtotal.toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="mt-4 p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-green-500" />
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Fornecedor: {relatedPurchase.supplierName}</span>
                      </div>
                      <Button 
                        variant="default" 
                        className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20"
                        onClick={() => {
                          setSelectedTransaction(null);
                          setActiveTab('inventory');
                        }}
                      >
                        Gerenciar no Estoque
                        <Package className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                    <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sincronizando Dados da Compra...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Recurring & Installment Expenses Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 pb-12">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tighter text-lg leading-tight">Custos Fixos Mensais</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {recurringExpenses.map(expense => {
              const category = expenseCategories.find(c => c.id === expense.categoryId);
              return (
                <Card key={expense.id} className="bg-card/30 border-border/50 relative group overflow-hidden hover:border-orange-500/30 transition-all border-l-4 border-l-orange-500/50">
                  <div className="p-5 flex justify-between items-center">
                    <div className="space-y-1">
                      <h4 className="font-black text-sm md:text-base uppercase tracking-widest leading-none text-white">{expense.description || 'SEM DESCRIÇÃO'}</h4>
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> DIA {expense.dueDate}
                        </p>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{category?.name || 'Geral'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <p className="text-lg font-black text-white font-mono tabular-nums">R$ {expense.amount.toFixed(2)}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditRecurringClick(expense)} 
                          className="text-muted-foreground hover:text-primary h-8 w-8 rounded-lg hover:bg-primary/10"
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteRecurring(expense.id)} 
                          className="text-muted-foreground hover:text-red-500 h-8 w-8 rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tighter text-lg leading-tight">Compras Parceladas</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {installmentExpenses.map(expense => {
              const category = expenseCategories.find(c => c.id === expense.categoryId);
              return (
                <Card key={expense.id} className="bg-card/30 border-border/50 relative group overflow-hidden border-l-4 border-l-primary/50 hover:border-primary/30 transition-all">
                  <div className="p-5 flex justify-between items-center">
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary mb-1">
                        {expense.remainingInstallments} parcelas restantes
                      </Badge>
                      <h4 className="font-black text-sm md:text-base uppercase tracking-widest leading-none text-white">{expense.description || 'PARCELAMENTO'}</h4>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{category?.name || 'Geral'}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-lg font-black text-white font-mono tabular-nums">R$ {expense.installmentValue.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Total: R$ {expense.totalAmount.toFixed(2)}</p>
                      </div>
                        <Button variant="ghost" size="icon" onClick={async () => {
                        if (confirm('Deseja desativar este parcelamento?')) {
                          try {
                            await updateDoc(doc(db, 'installment_expenses', expense.id), { 
                              active: false,
                              status: 'deleted'
                            });
                            toast.success('Parcelamento desativado');
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, 'installment_expenses');
                          }
                        }
                      }} className="text-muted-foreground hover:text-red-500 h-10 w-10 opacity-40 hover:opacity-100"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Management Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="bg-[#0b1224] border-border max-w-2xl text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Settings2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">Categorias de Despesa</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-primary/60 flex items-center gap-2">
                  Organização avançada do financeiro
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
            {/* New Category Form */}
            <div className="flex gap-4 items-end bg-white/5 p-6 rounded-2xl border border-border/50">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Nova Categoria</label>
                <Input 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Fornecedores"
                  className="h-12 bg-background"
                />
              </div>
              <Button onClick={handleCreateCategory} className="h-12 px-6 font-bold uppercase tracking-widest text-[10px]">
                Criar
              </Button>
            </div>

            {/* List Categories */}
            <div className="space-y-6">
              {expenseCategories.map(cat => (
                <div key={cat.id} className="p-6 bg-card border border-border rounded-2xl space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xl font-black uppercase tracking-tight">{cat.name}</h4>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={async () => {
                        if (confirm('Deseja desativar esta categoria? (Ela será mantida no histórico como deletada)')) {
                          try {
                            await updateDoc(doc(db, 'expense_categories', cat.id), { 
                              status: 'deleted'
                            });
                            toast.success('Categoria desativada');
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, 'expense_categories');
                          }
                        }
                      }}
                      className="text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Subcategories */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subcategorias</p>
                    <div className="flex flex-wrap gap-2">
                      {cat.subcategories?.map(sub => (
                        <Badge key={sub} variant="secondary" className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest group">
                          {sub}
                          <button 
                            className="ml-2 hover:text-red-500"
                            onClick={async () => {
                              const updated = cat.subcategories.filter(s => s !== sub);
                              const { updateDoc, doc } = await import('firebase/firestore');
                              await updateDoc(doc(db, 'expense_categories', cat.id), { subcategories: updated });
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2 items-center mt-4">
                      <Input 
                        placeholder="Nova subcategoria..."
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        className="h-10 text-xs bg-background"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleAddSubcategory(cat.id)}
                        className="h-10 font-bold uppercase tracking-widest text-[10px]"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recurring Modal */}
      <Dialog open={isEditingRecurringModalOpen} onOpenChange={setIsEditingRecurringModalOpen}>
        <DialogContent className="bg-[#0b1224] border-border max-w-lg text-white p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-8 border-b border-border/50 bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Settings2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Ajustar Custo Fixo</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-primary/60">Recorrência Mensal</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-1">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3 h-3" /> Guia de Lançamento
              </p>
              <p className="text-[9px] text-muted-foreground leading-tight uppercase font-bold tracking-tighter">
                Custos Fixos são previsíveis e essenciais (Aluguel, Internet, Assinaturas). 
                Não use para compras sazonais ou variáveis de estoque.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Valor (R$)</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  className="h-14 bg-background border-border font-black text-xl tabular-nums focus:border-primary transition-all shadow-inner"
                  value={editRecAmount}
                  onChange={(e) => setEditRecAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Dia Vencimento</label>
                <Select value={editRecDueDate} onValueChange={setEditRecDueDate}>
                  <SelectTrigger className="h-14 bg-background border-border font-bold uppercase tracking-widest text-sm">
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b1224] border-border max-h-[300px]">
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()} className="font-mono">
                        DIAS {String(i + 1).padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Identificação do Custo</label>
              <Input 
                className="h-14 bg-background border-border font-black uppercase tracking-widest text-sm focus:border-primary transition-all placeholder:text-muted-foreground/30"
                value={editRecDescription}
                onChange={(e) => setEditRecDescription(e.target.value)}
                placeholder="EX: MENSALIDADE INTERNET"
              />
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-border/50 bg-card">
            <Button variant="ghost" onClick={() => setIsEditingRecurringModalOpen(false)} disabled={isSaving} className="font-bold uppercase tracking-widest text-xs">Descartar</Button>
            <Button onClick={handleUpdateRecurring} disabled={isSaving} className="h-14 px-10 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs">
              {isSaving ? 'Gravando...' : 'Atualizar Custo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

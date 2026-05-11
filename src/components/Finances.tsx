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
import { Plus, TrendingUp, TrendingDown, Receipt, Calendar, ArrowUpRight, ArrowDownRight, Filter, X, Users, ChevronRight, Settings2, Trash2, Info, CreditCard, Banknote, Smartphone, Wallet, QrCode, Zap, MoreHorizontal } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format, isToday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn, getShiftInterval, formatShiftDateTime, getShiftDate } from '../lib/utils';
import { DateRangePicker } from './DateRangePicker';

import { useFetchCollection } from '../hooks/useFetchCollection';
import { usePaymentFees } from '../hooks/usePaymentFees';

export function Finances({ user, setActiveTab }: { user: UserProfile, setActiveTab: (tab: string) => void }) {
  const { calculateNet } = usePaymentFees();
  const transConstraints = React.useMemo(() => [orderBy('date', 'desc'), limit(500)], []);
  const expConstraints = React.useMemo(() => [orderBy('date', 'desc'), limit(500)], []);

  const { data: rawTransactions } = useFetchCollection<Transaction>('transactions', {
    constraints: transConstraints
  });
  const { data: rawExpenses } = useFetchCollection<Transaction>('expenses', {
    constraints: expConstraints
  });
  const { data: rawPurchases } = useFetchCollection<any>('purchases', {
    constraints: React.useMemo(() => [orderBy('date', 'desc'), limit(100)], [])
  });
  const { data: recurringExpenses } = useFetchCollection<RecurringExpense>('recurring_expenses');
  const { data: installmentExpenses } = useFetchCollection<InstallmentExpense>('installment_expenses');
  const { data: customers } = useFetchCollection<Customer>('customers');
  const { data: expenseCategories } = useFetchCollection<ExpenseCategory>('expense_categories');

  const transactions = React.useMemo(() => {
    const merged = [...rawTransactions, ...rawExpenses.map(e => ({ ...e, type: 'expense' as const }))];
    return merged.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
      const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
      return dateB - dateA;
    }).slice(0, 500);
  }, [rawTransactions, rawExpenses]);

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFiadoModalOpen, setIsFiadoModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [relatedOrder, setRelatedOrder] = useState<Order | null>(null);
  const [relatedPurchase, setRelatedPurchase] = useState<Purchase | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Recurring Editing states
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [isEditingRecurringModalOpen, setIsEditingRecurringModalOpen] = useState(false);
  const [editRecAmount, setEditRecAmount] = useState('');
  const [editRecDescription, setEditRecDescription] = useState('');
  const [editRecDueDate, setEditRecDueDate] = useState('');

  // Date filter states
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // Advanced filters
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
            setRelatedPurchase({ ...purchaseDoc.data(), id: purchaseDoc.id } as Purchase);
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
  
  // Form states
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getShiftDate());
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState('3');
  const [dueDate, setDueDate] = useState('5');

  // Metas states
  const [metasView, setMetasView] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Category Management State
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
        
        // Register the "entrada" (down payment) as a transaction if paid now
        // The user example says they pay R$310 now and 3x R$230 later.
        // I will simplify and just create an InstallmentExpense.
        // Actually, the user says "pagamos só R$310,00 de entrada e pagaremos mais 3 parcelas de R$230,00"
        // This means Total is 310 + 3*230 = 1000.
        
        await addDoc(collection(db, 'installment_expenses'), {
          description,
          totalAmount: total,
          remainingAmount: total - (total / count), // Assuming first installment is paid now or handled by transaction
          installmentsCount: count,
          remainingInstallments: count - 1,
          installmentValue: installmentValue,
          nextDueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          categoryId: category,
          subCategory,
          createdAt: serverTimestamp(),
          active: true
        });
        
        // Record the immediate payment
        await addDoc(collection(db, 'expenses'), {
          categoryId: category,
          subCategory,
          category: selectedCat?.name || category,
          amount: installmentValue,
          description: `${description} (Entrada/Parcela 1/${count})`,
          date: new Date(expenseDate + "T12:00:00")
        });
        
        toast.success('Compra parcelada registrada');
      } else {
        // Write to 'expenses' collection to match user's Firestore structure
        await addDoc(collection(db, 'expenses'), {
          categoryId: category,
          subCategory,
          category: selectedCat?.name || category, // Legacy support
          amount: parseFloat(amount),
          description,
          date: new Date(expenseDate + "T12:00:00")
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

  const handleEditRecurringClick = (exp: RecurringExpense) => {
    setEditingRecurring(exp);
    setEditRecAmount((exp.amount || 0).toString());
    setEditRecDescription(exp.description || '');
    setEditRecDueDate((exp.dueDate || 1).toString());
    setIsEditingRecurringModalOpen(true);
  };

  const handleUpdateRecurring = async () => {
    if (!editingRecurring || !editRecAmount || !editRecDescription) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'recurring_expenses', editingRecurring.id), {
        description: editRecDescription,
        amount: parseFloat(editRecAmount),
        dueDate: parseInt(editRecDueDate),
        updatedAt: serverTimestamp()
      });
      toast.success('Despesa recorrente atualizada');
      setIsEditingRecurringModalOpen(false);
      setEditingRecurring(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'recurring_expenses');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'recurring_expenses', id));
      toast.success('Despesa recorrente removida');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'recurring_expenses');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName) return;
    try {
      await addDoc(collection(db, 'expense_categories'), {
        name: newCatName,
        subcategories: [],
        createdAt: serverTimestamp()
      });
      setNewCatName('');
      toast.success('Categoria criada');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expense_categories');
    }
  };

  const handleAddSubcategory = async (catId: string) => {
    if (!newSubName) return;
    try {
      const cat = expenseCategories.find(c => c.id === catId);
      if (!cat) return;
      
      const subcategories = [...(cat.subcategories || []), newSubName];
      await updateDoc(doc(db, 'expense_categories', catId), {
        subcategories
      });

      setNewSubName('');
      toast.success('Subcategoria adicionada');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'expense_categories');
    }
  };

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      // Basic type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      
      // Method filter
      if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false;
      
      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Search query
      if (searchQuery && !t.description?.toLowerCase().includes(searchQuery.toLowerCase()) && !t.category?.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      const tDate = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date));
      if (!tDate || isNaN(tDate.getTime())) return true;

      // Date filtering
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

  // Group transactions by shift date
  const groupedTransactions = React.useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      const shiftDate = getShiftDate(t.date);
      const dateKey = shiftDate ? format(shiftDate, 'yyyy-MM-dd') : 'Data Indefinida';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const incomeTransactions = filteredTransactions.filter(t => t.type === 'income' && !t.isFiado);
  
  // Total Bruto (Vendas em dinheiro/cartão/pix)
  const totalGrossIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // Total de Taxas (Cartão/Pix)
  const totalFees = incomeTransactions.reduce((sum, t) => sum + (t.feeAmount || 0), 0);
  
  // Total Líquido de Vendas (Recebido - após taxas)
  const totalNetIncome = incomeTransactions.reduce((sum, t) => {
    const net = t.netAmount !== undefined ? t.netAmount : (t.amount - (t.feeAmount || 0));
    return sum + net;
  }, 0);
  
  // Total de Custo de Mercadoria (COGS)
  const totalCostOfGoods = incomeTransactions.reduce((sum, t) => sum + (t.cost || 0), 0);
  
  // Total de Despesas Operacionais (Saídas manuais)
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Lucro Líquido Real = (NetIncome - CostOfGoods - totalExpense)
  const realNetProfit = totalNetIncome - totalCostOfGoods - totalExpense;

  // For backward compatibility or specific UI needs
  const totalIncome = totalGrossIncome;

  const totalFiado = customers.reduce((sum, c) => sum + Math.abs(Math.min(0, c.balance || 0)), 0);

  const previousMetrics = React.useMemo(() => {
    let prevStart: Date;
    let prevEnd: Date;
    const { start, end } = getShiftInterval();

    if (dateFilter === 'today') {
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 1);
    } else if (dateFilter === 'week') {
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 7);
    } else if (dateFilter === 'month') {
      prevStart = new Date(start);
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevEnd = new Date(end);
      prevEnd.setMonth(prevEnd.getMonth() - 1);
    } else {
      return null;
    }

    const prevIncome = rawTransactions
      .filter(t => t.type === 'income' && !(t as any).isFiado)
      .filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date));
        return isWithinInterval(tDate, { start: prevStart, end: prevEnd });
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const prevExpense = rawTransactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date));
        return isWithinInterval(tDate, { start: prevStart, end: prevEnd });
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return { income: prevIncome, expense: prevExpense };
  }, [rawTransactions, dateFilter]);

  const calculateTrend = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null;
    const diff = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(diff).toFixed(1),
      isUp: diff > 0,
      label: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
    };
  };

  const incomeTrend = calculateTrend(totalIncome, previousMetrics?.income);
  const expenseTrend = calculateTrend(totalExpense, previousMetrics?.expense);

  // Metas Logic
  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const currentMonthDays = daysInMonth(now.getMonth(), now.getFullYear());
  
  const incomeMetaProgress = React.useMemo(() => {
    const { start: todayStart, end: todayEnd } = getShiftInterval();
    const today = rawTransactions.filter(t => t.type === 'income' && !(t as any).isFiado && isWithinInterval(t.date?.toDate ? t.date.toDate() : new Date(0), { start: todayStart, end: todayEnd })).reduce((acc, t) => acc + (t.amount || 0), 0);
    const week = rawTransactions.filter(t => t.type === 'income' && !(t as any).isFiado && isThisWeek(t.date?.toDate ? t.date.toDate() : new Date(0), { weekStartsOn: 0 })).reduce((acc, t) => acc + (t.amount || 0), 0);
    const month = rawTransactions.filter(t => t.type === 'income' && !(t as any).isFiado && isThisMonth(t.date?.toDate ? t.date.toDate() : new Date(0))).reduce((acc, t) => acc + (t.amount || 0), 0);
    return { today, week, month };
  }, [rawTransactions]);

  const variableCostsMonth = React.useMemo(() => {
    const directPurchases = rawPurchases
      .filter(p => isThisMonth(p.date?.toDate ? p.date.toDate() : new Date(0)))
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    
    const otherVariableExpenses = transactions
      .filter(t => 
        t.type === 'expense' && 
        t.category !== 'Compra de Estoque' && 
        t.category !== 'Suprimentos' &&
        isThisMonth(t.date?.toDate ? t.date.toDate() : new Date(0))
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);
      
    return otherVariableExpenses + directPurchases;
  }, [transactions, rawPurchases]);

  const monthlyObligations = React.useMemo(() => {
    const recurring = recurringExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const installments = installmentExpenses.reduce((sum, e) => sum + (e.installmentValue || 0), 0);
    return recurring + installments + variableCostsMonth;
  }, [recurringExpenses, installmentExpenses, variableCostsMonth]);

  const dailyGoal = monthlyObligations / currentMonthDays;
  const weeklyGoal = (monthlyObligations / currentMonthDays) * 7;

  const currentMetaAmount = metasView === 'daily' ? dailyGoal : metasView === 'weekly' ? weeklyGoal : monthlyObligations;
  const currentIncomeInView = metasView === 'daily' ? incomeMetaProgress.today : metasView === 'weekly' ? incomeMetaProgress.week : incomeMetaProgress.month;
  const metaProgressPercent = Math.min(100, (currentIncomeInView / currentMetaAmount) * 100);

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
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Financial Health - Metrics Banner (Command Center Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Faturamento Bruto */}
        <Card 
          className={cn(
            "bg-card/30 border-border/50 overflow-hidden relative group cursor-pointer transition-all rounded-[40px] h-[180px] hover:border-green-500/30",
            typeFilter === 'income' && "ring-2 ring-green-500/50 bg-green-500/10"
          )}
          onClick={() => setTypeFilter(typeFilter === 'income' ? 'all' : 'income')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.15)] group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-green-500" />
              </div>
              {incomeTrend && (
                <Badge className={cn(
                  "font-mono font-black text-[10px] px-3 py-1 rounded-full border shadow-sm",
                  incomeTrend.isUp ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                  {incomeTrend.isUp ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
                  {incomeTrend.label}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground mb-2 leading-none">Faturamento Bruto</p>
              <h3 className="text-3xl font-black text-white leading-none font-mono tracking-tighter tabular-nums">
                R$ {totalGrossIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>
        
        {/* Total Saídas */}
        <Card 
          className={cn(
            "bg-card/30 border-border/50 overflow-hidden relative group cursor-pointer transition-all rounded-[40px] h-[180px] hover:border-red-500/30",
            typeFilter === 'expense' && "ring-2 ring-red-500/50 bg-red-500/10"
          )}
          onClick={() => setTypeFilter(typeFilter === 'expense' ? 'all' : 'expense')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] group-hover:scale-110 transition-transform">
                <TrendingDown className="w-7 h-7 text-red-500" />
              </div>
              {expenseTrend && (
                <Badge className={cn(
                  "font-mono font-black text-[10px] px-3 py-1 rounded-full border shadow-sm",
                  expenseTrend.isUp ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
                )}>
                  {expenseTrend.isUp ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
                  {expenseTrend.label}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground mb-2 leading-none">Total de Saídas</p>
              <h3 className="text-3xl font-black text-red-500 leading-none font-mono tracking-tighter tabular-nums">
                R$ {(totalExpense + totalCostOfGoods + totalFees).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Líquido Real */}
        <Card className="bg-primary/90 border-primary overflow-hidden relative group rounded-[40px] h-[180px] shadow-2xl shadow-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
          <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-white/30 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                Resultado Final
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/70 mb-2 leading-none">Lucro Líquido Real</p>
              <h3 className="text-3xl font-black text-white leading-none font-mono tracking-tighter tabular-nums">
                R$ {realNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Fiado Pendente */}
        <Card 
          className="bg-card/30 border-border/50 overflow-hidden relative group cursor-pointer transition-all rounded-[40px] h-[180px] hover:border-orange-500/30"
          onClick={() => setIsFiadoModalOpen(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)] group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-orange-500" />
              </div>
              <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full animate-pulse">
                A Receber
              </Badge>
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

      {/* Metas / Objectives Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-xl leading-tight">Gestão de Objetivos Financeiros</h3>
              <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase font-bold">Monitoramento de Ponto de Equilíbrio Operacional</p>
            </div>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-xl border border-border/50">
            {(['daily', 'weekly', 'monthly'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setMetasView(view)}
                className={cn(
                  "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  metasView === view ? "bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "text-muted-foreground hover:text-white"
                )}
              >
                {view === 'daily' ? 'Diário' : view === 'weekly' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/40 border-border/50 overflow-hidden relative group flex flex-col justify-center min-h-[300px] rounded-[40px]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
            <CardContent className="p-8 relative z-10 flex flex-col items-center text-center">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-2">
                Objetivo {metasView === 'daily' ? 'Diário' : metasView === 'weekly' ? 'Semanal' : 'Mensal'}
              </p>
              
              <div className="mb-8">
                <h3 className="text-5xl font-black text-white tabular-nums tracking-tighter mb-2 font-mono">
                  R$ {currentMetaAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
                <div className="flex items-center justify-center gap-2 text-muted-foreground px-4 py-1 bg-white/5 rounded-full border border-white/5">
                  <Settings2 className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Baseado em Custos Atuais</span>
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="flex justify-between items-end mb-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Progresso Realizado</p>
                  <p className="text-xl font-black text-primary tabular-nums font-mono">{metaProgressPercent.toFixed(1)}%</p>
                </div>
                <div className="h-6 bg-white/5 rounded-2xl overflow-hidden border border-white/5 p-1 relative">
                  <div 
                    className={cn(
                      "h-full rounded-xl transition-all duration-1000 relative z-10",
                      metaProgressPercent >= 100 ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" : "bg-primary shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                    )} 
                    style={{ width: `${metaProgressPercent}%` }} 
                  >
                    {metaProgressPercent > 15 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white/[0.03] p-3 rounded-xl border border-white/5">
                   <div className="text-left">
                     <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Alcançado</p>
                     <p className="text-sm font-black text-white tabular-nums font-mono">R$ {currentIncomeInView.toLocaleString('pt-BR')}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Faltam</p>
                     <p className="text-sm font-black text-orange-500 tabular-nums font-mono">
                       R$ {Math.max(0, currentMetaAmount - currentIncomeInView).toLocaleString('pt-BR')}
                     </p>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50 overflow-hidden rounded-[40px] md:col-span-2">
             <CardContent className="p-8 h-full flex flex-col">
               <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground">Composição de Custos Operacionais</p>
                    <p className="text-[9px] text-muted-foreground/60 uppercase font-medium tracking-widest italic">Valores consolidados para o ciclo de faturamento vigente</p>
                 </div>
                 <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-right">
                   <p className="text-[8px] font-black uppercase tracking-widest text-primary mb-1">Total de Saídas Projetadas (Mês)</p>
                   <p className="text-3xl font-black text-white font-mono tabular-nums leading-none tracking-tighter">R$ {monthlyObligations.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                 </div>
               </div>
               
               <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
                 {/* Fixed Costs Section */}
                 <div className="space-y-3">
                   <div className="flex items-center justify-between mb-3">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Obrigações Fixas</span>
                     </div>
                     <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-orange-500/20 text-orange-500 bg-orange-500/5">Recorrente</Badge>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recurringExpenses.map(exp => (
                      <div key={exp.id} className="flex justify-between items-center bg-white/[0.02] p-4 rounded-[40px] border border-white/5 hover:bg-white/[0.04] transition-all group hover:border-orange-500/20 px-8">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-white/90 uppercase tracking-tight group-hover:text-white">{exp.description}</span>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 italic">Vencimento: Dia {exp.dueDate}</span>
                        </div>
                        <span className="font-mono font-black text-sm text-white">R$ {exp.amount.toFixed(2)}</span>
                      </div>
                    ))}
                   </div>
                 </div>

                 {/* Installments Section */}
                 {installmentExpenses.length > 0 && (
                   <div className="space-y-3 mt-8">
                     <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Contratos de Parcelamento</span>
                       </div>
                       <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-blue-500/20 text-blue-500 bg-blue-500/5">Ativos</Badge>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {installmentExpenses.map(exp => (
                        <div key={exp.id} className="flex justify-between items-center bg-white/[0.02] p-4 rounded-[40px] border border-white/5 hover:bg-white/[0.04] transition-all group hover:border-blue-500/20 px-8">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-white/90 uppercase tracking-tight group-hover:text-white">{exp.description}</span>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 italic">Parcela {exp.installmentsCount - exp.remainingInstallments + 1}/{exp.installmentsCount}</span>
                          </div>
                          <span className="font-mono font-black text-sm text-white">R$ {exp.installmentValue.toFixed(2)}</span>
                        </div>
                      ))}
                     </div>
                   </div>
                 )}

                 {/* Variable Costs Section -> Supplier Purchases */}
                 <div className="space-y-3 mt-8">
                   <div className="flex items-center justify-between mb-3">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500">Suprimentos & Fornecedores</span>
                     </div>
                     <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-green-500/20 text-green-500 bg-green-500/5">Variável</Badge>
                   </div>
                   <div className="flex justify-between items-center bg-green-500/5 p-5 rounded-[40px] border border-green-500/10 hover:bg-green-500/10 transition-all group">
                     <div className="flex flex-col">
                       <span className="text-sm font-black text-white/90 uppercase tracking-tight group-hover:text-white">Compras de Estoque Reais (Mês)</span>
                       <p className="text-[9px] font-bold text-green-500/60 uppercase tracking-[0.1em] mt-1">Consolidado de todas as transações e notas de entrada</p>
                     </div>
                     <div className="text-right">
                       <span className="font-mono font-black text-2xl text-green-500 tabular-nums">R$ {variableCostsMonth.toFixed(2)}</span>
                     </div>
                   </div>
                 </div>

                 {recurringExpenses.length === 0 && installmentExpenses.length === 0 && variableCostsMonth === 0 && (
                   <div className="flex flex-col items-center justify-center py-16 opacity-30 grayscale">
                     <Settings2 className="w-12 h-12 mb-3 animate-spin-slow" />
                     <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em]">Nenhuma obrigação detectada</p>
                   </div>
                 )}
               </div>
             </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-card/40 border-border/50 overflow-hidden rounded-[40px] shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-lg leading-tight">Histórico de Transações</h3>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-bold">Monitoramento de Fluxo {getFilterLabel()}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:flex-1 justify-end items-center">
            {/* Search Bar */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="BUSCAR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/10 rounded-[20px] text-[10px] font-black tracking-widest uppercase focus:ring-primary/50"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px] h-12 px-6 rounded-[20px] gap-3 font-bold tracking-widest uppercase border-border hover:bg-white/5 text-[10px] bg-card/50">
                <div className="flex items-center gap-2 truncate">
                  <Receipt className="w-4 h-4 text-primary shrink-0" />
                  <SelectValue placeholder="CATEGORIA" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0b1224] border-border text-white">
                <SelectItem value="all" className="uppercase font-bold tracking-widest text-xs">TODAS CATEGORIAS</SelectItem>
                <SelectItem value="Venda de Produtos" className="uppercase font-bold tracking-widest text-xs text-green-500">VENDA DE PRODUTOS</SelectItem>
                <SelectItem value="Compra de Estoque" className="uppercase font-bold tracking-widest text-xs text-red-500">COMPRA DE ESTOQUE</SelectItem>
                {expenseCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="uppercase font-bold tracking-widest text-xs">
                    {cat.name.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full md:w-[160px] h-14 px-6 rounded-[20px] gap-3 font-bold tracking-widest uppercase border-border hover:bg-white/5 text-[10px] bg-card/50">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  <SelectValue placeholder="MÉTODO" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0b1224] border-border text-white">
                <SelectItem value="all" className="uppercase font-bold tracking-widest text-xs">TODOS MÉTODOS</SelectItem>
                <SelectItem value="Dinheiro" className="uppercase font-bold tracking-widest text-xs">DINHEIRO</SelectItem>
                <SelectItem value="Pix" className="uppercase font-bold tracking-widest text-xs">PIX</SelectItem>
                <SelectItem value="Cartão de Débito" className="uppercase font-bold tracking-widest text-xs">DÉBITO</SelectItem>
                <SelectItem value="Cartão de Crédito" className="uppercase font-bold tracking-widest text-xs">CRÉDITO</SelectItem>
                <SelectItem value="Fiado" className="uppercase font-bold tracking-widest text-xs text-orange-500">FIADO</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={dateFilter} onValueChange={(val: any) => {
                setDateFilter(val);
                if (val !== 'custom') {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }
              }}>
                <SelectTrigger className="w-full md:w-[160px] h-14 px-6 rounded-[20px] gap-3 font-bold tracking-widest uppercase border-border hover:bg-white/5 text-[10px] bg-card/50">
                  <Filter className="w-4 h-4 text-primary" />
                  <SelectValue placeholder="PERÍODO" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-border text-white">
                  <SelectItem value="all" className="uppercase font-bold tracking-widest text-xs">TODOS</SelectItem>
                  <SelectItem value="today" className="uppercase font-bold tracking-widest text-xs">HOJE</SelectItem>
                  <SelectItem value="week" className="uppercase font-bold tracking-widest text-xs">SEMANA</SelectItem>
                  <SelectItem value="month" className="uppercase font-bold tracking-widest text-xs">MÊS</SelectItem>
                  <SelectItem value="custom" className="uppercase font-bold tracking-widest text-xs">PERSONALIZADO</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === 'custom' && (
                <div className="animate-in slide-in-from-left-2 duration-300">
                  <DateRangePicker 
                    onApply={(range) => {
                      if (range) {
                        setStartDate(range.from);
                        setEndDate(range.to);
                        toast.success('Filtro de data aplicado');
                      }
                    }}
                    initialRange={startDate && endDate ? { from: startDate, to: endDate } : undefined}
                    className="w-full md:min-w-[280px]"
                  />
                </div>
              )}
            </div>
          </div>

            <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
              <DialogTrigger
              nativeButton={true}
              render={
                <Button className="w-full md:w-auto h-12 px-8 rounded-[20px] gap-3 font-bold tracking-widest uppercase bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 text-[10px]">
                  <Plus className="w-4 h-4" />
                  Lançar Saída
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
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Data do Lançamento</label>
                      <Input 
                        type="date"
                        className="h-12 bg-background border-border font-bold uppercase tracking-widest text-[10px]"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Categoria</label>
                      <button 
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-[9px] font-bold text-primary hover:underline uppercase tracking-widest"
                      >
                        Gerenciar
                      </button>
                    </div>
                    <Select value={category} onValueChange={(val) => {
                      setCategory(val);
                      setSubCategory('');
                    }}>
                      <SelectTrigger className="h-12 bg-background border-border font-bold uppercase tracking-widest text-[10px]">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0b1224] border-border max-h-[250px]">
                        {expenseCategories.length === 0 ? (
                          <div className="px-2 py-4 text-center text-muted-foreground text-[10px] font-bold uppercase">
                            Nenhuma categoria cadastrada
                          </div>
                        ) : (
                          expenseCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id} className="uppercase font-bold tracking-widest text-xs">
                              {cat.name}
                            </SelectItem>
                          ))
                        )}
                        {/* Legacy default categories if none exist */}
                        {expenseCategories.length === 0 && (
                          <>
                            <SelectItem value="Suprimentos" className="uppercase font-bold tracking-widest text-xs">Suprimentos</SelectItem>
                            <SelectItem value="Aluguel" className="uppercase font-bold tracking-widest text-xs">Aluguel</SelectItem>
                            <SelectItem value="Utilidades" className="uppercase font-bold tracking-widest text-xs">Utilidades</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {category && expenseCategories.find(c => c.id === category)?.subcategories?.length! > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Subcategoria (Opcional)</label>
                      <Select value={subCategory} onValueChange={setSubCategory}>
                        <SelectTrigger className="h-12 bg-background border-border font-bold uppercase tracking-widest text-[10px]">
                          <SelectValue placeholder="Selecionar Subcategoria" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0b1224] border-border">
                          {expenseCategories.find(c => c.id === category)?.subcategories.map(sub => (
                            <SelectItem key={sub} value={sub} className="uppercase font-bold tracking-widest text-xs">
                              {sub}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Descrição</label>
                    <Input 
                      className="h-12 bg-background border-border"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Reposição de Cerveja"
                    />
                  </div>

                  <div className="pt-4 border-t border-border/50 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-border/50">
                        <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Fixa Mensal?</label>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-border bg-background accent-primary"
                          checked={isRecurring}
                          onChange={(e) => {
                            setIsRecurring(e.target.checked);
                            if (e.target.checked) setIsInstallment(false);
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-border/50">
                        <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Parcelada?</label>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-border bg-background accent-primary"
                          checked={isInstallment}
                          onChange={(e) => {
                            setIsInstallment(e.target.checked);
                            if (e.target.checked) setIsRecurring(false);
                          }}
                        />
                      </div>
                    </div>
                    
                    {isRecurring && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-1">
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                            <Info className="w-3 h-3" /> Definição de Custo Fixo
                          </p>
                          <p className="text-[9px] text-muted-foreground leading-tight uppercase font-bold tracking-tighter">
                            Essencial e previsível. Ocorrem todo mês (Ex: Aluguel, Internet).
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Dia do Vencimento</label>
                          <Select value={dueDate} onValueChange={setDueDate}>
                            <SelectTrigger className="h-12 bg-background border-border font-bold uppercase tracking-widest text-[10px]">
                              <SelectValue placeholder="Selecionar Dia" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b1224] border-border max-h-[200px]">
                              {Array.from({ length: 31 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()} className="font-mono">
                                  DIA {String(i + 1).padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest leading-tight">
                            Esta despesa será listada automaticamente no relatório mensal.
                          </p>
                        </div>
                      </div>
                    )}

                    {isInstallment && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Número de Parcelas</label>
                          <Select value={installmentsCount} onValueChange={setInstallmentsCount}>
                            <SelectTrigger className="h-12 bg-background border-border font-bold uppercase tracking-widest text-[10px]">
                              <SelectValue placeholder="Selecionar Parcelas" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b1224] border-border">
                              {[2,3,4,5,6,10,12,24].map(n => (
                                <SelectItem key={n} value={n.toString()} className="font-mono">{n} Parcelas</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 text-center">Simulação</p>
                          <p className="text-sm font-black text-white text-center">
                            {installmentsCount}x de R$ {(parseFloat(amount || '0') / parseInt(installmentsCount)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
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

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/5 sticky top-0 z-20">
                <TableRow className="border-border hover:bg-transparent border-b">
                  <TableHead className="text-[10px] font-black tracking-widest uppercase text-muted-foreground h-16 px-8">Hora</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest uppercase text-muted-foreground h-16 px-8">Tipo</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest uppercase text-muted-foreground h-16 px-8">Categoria</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest uppercase text-muted-foreground h-16 px-8">Descrição / Método</TableHead>
                  <TableHead className="text-right text-[10px] font-black tracking-widest uppercase text-muted-foreground h-16 px-8">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedTransactions).map(([date, transactions]) => (
                  <React.Fragment key={date}>
                    <TableRow className="bg-primary/5 hover:bg-primary/5 border-y border-white/5">
                      <TableCell colSpan={5} className="py-3 px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-primary rounded-full" />
                          <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">
                            MOVIMENTAÇÃO DE {date}
                          </span>
                          <Badge variant="outline" className="ml-auto text-[9px] font-bold border-primary/20 text-primary uppercase tracking-widest">
                            {transactions.length} LANÇAMENTOS
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                    {transactions.map((t, idx) => (
                      <TableRow 
                        key={`${t.id}-${idx}`} 
                        className="border-border hover:bg-white/5 transition-all cursor-pointer group h-20"
                        onClick={() => setSelectedTransaction(t)}
                      >
                        <TableCell className="px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors tabular-nums">
                          <div className="flex flex-col">
                            <span className="text-white font-mono text-xs">{t.date ? format(t.date.toDate ? t.date.toDate() : t.date, 'HH:mm') : '--:--'}</span>
                            <span className="opacity-40">{t.date ? format(t.date.toDate ? t.date.toDate() : t.date, 'dd/MM') : ''}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-8">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110",
                              t.type === 'income' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                            )}>
                              {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest leading-none mb-1",
                                t.type === 'income' ? "text-green-500" : "text-red-500"
                              )}>
                                {t.type === 'income' ? 'Entrada' : 'Saída'}
                              </span>
                              <span className="text-xs font-bold uppercase tracking-tighter text-white/90">{t.category}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-8">
                           <div className="flex flex-col max-w-[300px]">
                             <span className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                               {t.description || 'Sem descrição'}
                             </span>
                             {t.subCategory && (
                               <span className="text-[9px] text-primary/60 uppercase font-black tracking-widest mt-0.5">
                                 {t.subCategory}
                               </span>
                             )}
                           </div>
                        </TableCell>
                        <TableCell className="px-8">
                           <div className="flex items-center gap-3 bg-white/5 py-2 px-4 rounded-2xl border border-white/5 w-fit">
                             <div className={cn(
                               "w-8 h-8 rounded-lg flex items-center justify-center",
                               t.paymentMethod === 'Pix' ? "bg-cyan-500/20 text-cyan-500" : 
                               t.paymentMethod === 'Dinheiro' ? "bg-green-500/20 text-green-500" : 
                               t.paymentMethod === 'Crédito' || t.paymentMethod === 'Débito' || t.paymentMethod === 'Cartão' ? "bg-blue-500/20 text-blue-500" :
                               t.paymentMethod === 'Fiado' ? "bg-orange-500/20 text-orange-500" : "bg-muted/20 text-muted-foreground"
                             )}>
                               {t.paymentMethod === 'Pix' ? <QrCode className="w-4 h-4" /> : 
                                t.paymentMethod === 'Dinheiro' ? <Banknote className="w-4 h-4" /> : 
                                t.paymentMethod === 'Fiado' ? <Users className="w-4 h-4" /> : 
                                (t.paymentMethod === 'Crédito' || t.paymentMethod === 'Débito' || t.paymentMethod === 'Cartão') ? <CreditCard className="w-4 h-4" /> :
                                <MoreHorizontal className="w-4 h-4" />}
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{t.paymentMethod || 'N/A'}</span>
                           </div>
                        </TableCell>
                        <TableCell className={cn(
                          "px-8 text-right font-mono font-black",
                          ((t.type === 'income' ? t.amount : -t.amount) || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          <div className="flex flex-col items-end">
                            <span className="text-xl tracking-tighter tabular-nums">
                              {((t.type === 'income' ? t.amount : -t.amount) || 0) >= 0 ? '+' : '-'} R$ {Math.abs(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {t.type === 'income' && (t.feeAmount || 0) > 0 && (
                              <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mt-0.5 font-bold flex items-center gap-1">
                                <Info className="w-3 h-3 opacity-50" />
                                Líq: R$ {(t.netAmount || (t.amount - (t.feeAmount || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
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
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border",
                          t.type === 'income' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                        )}>
                          {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] tabular-nums leading-none mb-1">
                            {t.date ? format(t.date.toDate ? t.date.toDate() : t.date, 'HH:mm') : '--:--'}
                          </p>
                          <h4 className="font-black text-sm uppercase tracking-widest leading-none">{t.category}</h4>
                        </div>
                      </div>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/5",
                        t.paymentMethod === 'Pix' ? "text-cyan-500" : 
                        t.paymentMethod === 'Dinheiro' ? "text-green-500" : 
                        t.paymentMethod === 'Fiado' ? "text-orange-500" : "text-blue-500"
                      )}>
                        {t.paymentMethod === 'Pix' ? <QrCode className="w-4 h-4" /> : 
                         t.paymentMethod === 'Dinheiro' ? <Banknote className="w-4 h-4" /> : 
                         t.paymentMethod === 'Fiado' ? <Users className="w-4 h-4" /> : 
                         <CreditCard className="w-4 h-4" />}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest line-clamp-1">{t.description || 'Sem descrição'}</p>
                        {t.subCategory && <p className="text-[8px] text-primary/60 uppercase font-black tracking-widest mt-0.5">{t.subCategory}</p>}
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className={cn(
                          "font-mono font-black text-lg leading-none tabular-nums",
                          ((t.type === 'income' ? t.amount : -t.amount) || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {((t.type === 'income' ? t.amount : -t.amount) || 0) >= 0 ? '+' : '-'} R$ {Math.abs(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {t.type === 'income' && (t.feeAmount || 0) > 0 && (
                          <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                            Líq: R$ {(t.netAmount || (t.amount - (t.feeAmount || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                        variant="ghost" 
                        size="sm"
                        className="text-[9px] font-black uppercase tracking-widest hover:bg-green-500/10 text-green-500"
                        onClick={() => {
                          setSelectedTransaction(null);
                          setActiveTab('inventory');
                        }}
                      >
                        Gerenciar Estoque
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
                        if (confirm('Deseja cancelar este parcelamento?')) {
                          try {
                            await deleteDoc(doc(db, 'installment_expenses', expense.id));
                            toast.success('Parcelamento removido');
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
          <div className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
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
            <button onClick={() => setIsCategoryModalOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

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
                        if (confirm('Excluir esta categoria e todas subcategorias?')) {
                          await deleteDoc(doc(db, 'expense_categories', cat.id));
                          toast.success('Categoria excluída');
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
          <div className="p-8 border-b border-border/50 bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Settings2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Ajustar Custo Fixo</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-primary/60">Recorrência Mensal</p>
              </div>
            </div>
          </div>

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

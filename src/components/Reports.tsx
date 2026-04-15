import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Transaction, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export function Reports({ user }: { user: UserProfile }) {
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0 });
  const [monthlySummary, setMonthlySummary] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Monthly Summary
      const currentMonth = format(new Date(), 'yyyy-MM');
      try {
        const summaryDoc = await getDoc(doc(db, 'bi_summaries', currentMonth));
        if (summaryDoc.exists()) {
          setMonthlySummary(summaryDoc.data());
        }
      } catch (error) {
        console.error("Error fetching monthly summary:", error);
      }

      const fetchDays = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        const start = startOfDay(date);
        const end = endOfDay(date);

        const qTrans = query(
          collection(db, 'transactions'),
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<=', Timestamp.fromDate(end))
        );

        const qExp = query(
          collection(db, 'expenses'),
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<=', Timestamp.fromDate(end))
        );

        return Promise.all([getDocs(qTrans), getDocs(qExp)]).then(([transSnapshot, expSnapshot]) => {
          const dayTransactions = transSnapshot.docs.map(doc => doc.data() as Transaction);
          const dayExpenses = expSnapshot.docs.map(doc => doc.data() as Transaction);
          
          const income = dayTransactions.filter(t => t.type === 'income' && !(t as any).isFiado).reduce((s, t) => s + (t.amount || 0), 0);
          const cost = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.cost || 0), 0);
          const expenseFromTrans = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
          const expenseFromExp = dayExpenses.reduce((s, t) => s + (t.amount || 0), 0);

          const totalDayExpense = expenseFromTrans + expenseFromExp;

          return {
            date,
            name: format(date, 'EEE', { locale: ptBR }).toUpperCase(),
            fullDate: format(date, 'dd/MM'),
            income,
            expense: totalDayExpense,
            cost,
            profit: income - cost - totalDayExpense
          };
        });
      });

      try {
        const results = await Promise.all(fetchDays);
        const sortedResults = results.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        let totalIncome = 0;
        let totalExpense = 0;
        
        sortedResults.forEach(r => {
          totalIncome += r.income;
          totalExpense += r.expense;
        });

        setDailyData(sortedResults);
        setStats({ income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense });
      } catch (error) {
        console.error("Error fetching daily data:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Processando Dados Estratégicos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {monthlySummary && (
        <Card className="border-primary/20 bg-primary/5 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary">Resumo Consolidado: {monthlySummary.month}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vendas</p>
                <p className="text-xl font-black">{monthlySummary.salesCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Receita</p>
                <p className="text-xl font-black text-green-500">R$ {monthlySummary.totalRevenue?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Despesas</p>
                <p className="text-xl font-black text-red-500">R$ {monthlySummary.totalExpenses?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo</p>
                <p className="text-xl font-black text-primary">R$ {(monthlySummary.totalRevenue - monthlySummary.totalExpenses).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Receita Total (7d)" value={stats.income} icon={<TrendingUp className="text-green-500" />} color="text-green-500" />
        <StatCard title="Despesa Total (7d)" value={stats.expense} icon={<TrendingDown className="text-red-500" />} color="text-red-500" />
        <StatCard title="Lucro Líquido (7d)" value={stats.profit} icon={<DollarSign className="text-primary" />} color="text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border bg-card/50 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Performance Semanal</CardTitle>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">Entradas vs Saídas</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: '#111827', 
                      border: '1px solid #1f2937', 
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="ENTRADAS" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="SAÍDAS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Tendência de Lucro</CardTitle>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">Evolução do Saldo</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0080ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0080ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111827', 
                      border: '1px solid #1f2937', 
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#0080ff" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                    name="LUCRO"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <Card className="border-border bg-card/50 rounded-2xl overflow-hidden group hover:border-primary/50 transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{title}</CardTitle>
        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/10 transition-colors">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-black tracking-tight", color)}>
          <span className="text-sm font-bold mr-1">R$</span>
          {(value || 0).toFixed(2)}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 font-bold tracking-widest uppercase">Consolidado Semanal</p>
      </CardContent>
    </Card>
  );
}

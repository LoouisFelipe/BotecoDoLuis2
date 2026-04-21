import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Transaction, UserProfile, PaymentFeeConfig } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, Activity, Sparkles, ArrowUpRight, ArrowDownRight, Minus, PackageMinus } from 'lucide-react';
import { cn } from '../lib/utils';
import { geminiService } from '../services/geminiService';
import Markdown from 'react-markdown';

export function Reports({ user, setActiveTab }: { user: UserProfile, setActiveTab: (tab: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0, grossProfit: 0, grossMarginPct: 0 });
  const [monthlySummary, setMonthlySummary] = useState<any | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleSmartAnalysis = async () => {
    setAnalyzing(true);
    try {
      const prompt = `
        Analise os seguintes dados de performance semanal do meu bar:
        ${JSON.stringify(dailyData)}
        
        Considere que:
        - Receita Total: R$ ${stats.income.toFixed(2)}
        - Despesa Total: R$ ${stats.expense.toFixed(2)}
        - Lucro Líquido: R$ ${stats.profit.toFixed(2)}
        
        Forneça uma análise estratégica detalhada, identificando padrões, dias mais lucrativos e sugestões de melhoria.
      `;
      const result = await geminiService.highThinkingTask(prompt, "Você é um consultor de negócios sênior especializado em gastronomia e vida noturna.");
      setAiAnalysis(result);
    } catch (error) {
      console.error("Error in AI analysis:", error);
    } finally {
      setAnalyzing(false);
    }
  };

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

      // Fetch Rates explicitly for strict accuracy
      let rates: PaymentFeeConfig = { credit_pct: 0, debit_pct: 0, pix_pct: 0 };
      try {
        const docSnap = await getDoc(doc(db, 'payment_fees', 'config_rates'));
        if (docSnap.exists()) {
          rates = docSnap.data() as PaymentFeeConfig;
        }
      } catch (err) {
        console.error('Error fetching rates', err);
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
          
          let rawIncome = 0;
          let paymentFees = 0;
          
          dayTransactions.filter(t => t.type === 'income' && !(t as any).isFiado).forEach(t => {
             rawIncome += t.amount;
             
             // Dynamic fee calculation
             let pct = 0;
             const method = t.paymentMethod?.toUpperCase();
             if (method === 'CRÉDITO' || method === 'CREDITO') pct = rates.credit_pct || 0;
             else if (method === 'DÉBITO' || method === 'DEBITO') pct = rates.debit_pct || 0;
             else if (method === 'PIX') pct = rates.pix_pct || 0;

             // Only deduct if not natively present (backwards compatibility)
             paymentFees += t.feeAmount !== undefined ? t.feeAmount : ((t.amount * pct) / 100);
          });
          
          const income = rawIncome; // Keep raw income for Gross Revenue
          const cost = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.cost || 0), 0);
          
          const expenseFromTrans = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
          const expenseFromExp = dayExpenses.reduce((s, t) => s + (t.amount || 0), 0);

          const totalDayExpense = expenseFromTrans + expenseFromExp + paymentFees;

          return {
            date,
            name: format(date, 'EEE', { locale: ptBR }).toUpperCase(),
            fullDate: format(date, 'dd/MM'),
            income, // Gross Income
            expense: totalDayExpense,
            paymentFees,
            numFeesCalc: dayTransactions.filter(t => t.type === 'income' && !(t as any).isFiado).length, // Just for debugging logic limits
            cost,
            grossProfit: income - cost,
            profit: income - cost - totalDayExpense
          };
        });
      });

      try {
        const results = await Promise.all(fetchDays);
        const sortedResults = results.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        let totalIncome = 0;
        let totalExpense = 0;
        let totalCost = 0;
        
        sortedResults.forEach(r => {
          totalIncome += r.income;
          totalExpense += r.expense;
          totalCost += r.cost;
        });

        const totalGrossProfit = totalIncome - totalCost;
        const generalGrossMargin = totalIncome > 0 ? (totalGrossProfit / totalIncome) * 100 : 0;

        const enhancedResults = sortedResults.map(r => ({
          ...r,
          grossMarginPct: r.income > 0 ? (r.grossProfit / r.income) * 100 : 0,
          generalGrossMargin
        }));

        setDailyData(enhancedResults);
        setStats({ 
          income: totalIncome, 
          expense: totalExpense, 
          profit: totalIncome - totalExpense - totalCost,
          grossProfit: totalGrossProfit,
          grossMarginPct: generalGrossMargin
        });
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
        <Card 
          className="bg-primary/20 border-primary/30 rounded-2xl overflow-hidden cursor-pointer relative group transition-all active:scale-[0.99]"
          onClick={() => setActiveTab('finances')}
        >
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <CardHeader className="pb-4 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Nexus Insights — {monthlySummary.month}</CardTitle>
                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Resumo Consolidado Mensal</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Volume de Vendas</p>
                <p className="text-2xl font-black text-white">{monthlySummary.salesCount} <span className="text-[10px] text-primary">ORDENS</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Receita Bruta</p>
                <p className="text-2xl font-black text-green-500">R$ {monthlySummary.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Custos & Despesas</p>
                <p className="text-2xl font-black text-red-500">R$ {monthlySummary.totalExpenses?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Margem Líquida</p>
                <p className="text-2xl font-black text-primary">R$ {(monthlySummary.totalRevenue - monthlySummary.totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7-Day Performance Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Receita (7d)" 
          value={stats.income} 
          icon={<TrendingUp className="w-6 h-6 text-green-500" />} 
          variant="green"
          onClick={() => setActiveTab('finances')}
        />
        <StatCard 
          title="Despesa Geral (7d)" 
          value={stats.expense} 
          icon={<TrendingDown className="w-6 h-6 text-red-500" />} 
          variant="red"
          onClick={() => setActiveTab('finances')}
        />
        <StatCard 
          title="Lucro Líquido (7d)" 
          value={stats.profit} 
          icon={<DollarSign className="w-6 h-6 text-primary" />} 
          variant="blue"
          onClick={() => setActiveTab('finances')}
        />
        <StatCard 
          title="Margem Bruta (7d)" 
          value={stats.grossProfit} 
          icon={<Sparkles className="w-6 h-6 text-orange-500" />} 
          variant="orange"
          subtext={`(${stats.grossMarginPct.toFixed(1)}%)`}
        />
      </div>

      <Card className="border-primary/30 bg-primary/5 border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-3 rounded-full">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Análise Estratégica IA</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Use o Gemini para analisar seus resultados semanais</p>
              </div>
            </div>
            <button
              onClick={handleSmartAnalysis}
              disabled={analyzing}
              className="w-full md:w-auto bg-primary text-white px-6 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ANALISANDO...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  GERAR INSIGHTS
                </>
              )}
            </button>
          </div>

          {aiAnalysis && (
            <div className="mt-6 p-6 bg-card/50 rounded-2xl border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-2 mb-4 text-primary font-bold text-[10px] uppercase tracking-[0.2em]">
                <Sparkles className="w-4 h-4" />
                Relatório de Inteligência
              </div>
              <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                <Markdown>{aiAnalysis}</Markdown>
              </div>
              <button 
                onClick={() => setAiAnalysis(null)}
                className="mt-4 text-[9px] font-bold text-muted-foreground hover:text-primary uppercase tracking-widest transition-colors"
              >
                Limpar Análise
              </button>
            </div>
          )}
        </CardContent>
      </Card>

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

      <Card className="border-border bg-card/50 rounded-2xl overflow-hidden mt-8">
        <CardHeader className="border-b border-border pb-4 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
              <PackageMinus className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Margem Bruta (Diária)</CardTitle>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">
                Receita Operacional vs Custo de Produtos
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Dia</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Receita</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Custo Prod.</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Lucro Bruto</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Margem %</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-center">vs Média Geral</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.map((day, idx) => {
                  const diff = day.grossMarginPct - stats.grossMarginPct;
                  const isPositive = diff > 0;
                  const isNeutral = Math.abs(diff) < 0.1;
                  
                  return (
                    <TableRow key={idx} className="border-border hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm uppercase">{day.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{day.fullDate}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-500 font-bold">
                        R$ {day.income.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-500 opacity-80">
                        R$ {day.cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-orange-500">
                        R$ {day.grossProfit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-orange-500/10 text-orange-500 font-black text-xs">
                          {day.grossMarginPct.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {isNeutral ? (
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Minus className="w-3 h-3" />
                            <span className="text-[10px] font-bold font-mono">0.0%</span>
                          </div>
                        ) : isPositive ? (
                          <div className="flex items-center justify-center gap-1 text-green-500">
                            <ArrowUpRight className="w-3 h-3" />
                            <span className="text-[10px] font-bold font-mono">+{diff.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-red-500">
                            <ArrowDownRight className="w-3 h-3" />
                            <span className="text-[10px] font-bold font-mono">{diff.toFixed(1)}%</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon, variant, onClick, subtext }: { title: string, value: number, icon: React.ReactNode, variant: 'green' | 'red' | 'blue' | 'orange', onClick?: () => void, subtext?: string }) {
  const variantStyles = {
    green: "from-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.1)] text-green-500",
    red: "from-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)] text-red-500",
    blue: "from-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)] text-primary",
    orange: "from-orange-500/5 shadow-[0_0_20px_rgba(249,115,22,0.1)] text-orange-500"
  };

  return (
    <Card 
      className={cn(
        "bg-card/30 border-border/50 overflow-hidden relative group transition-all",
        onClick && "cursor-pointer active:scale-95"
      )}
      onClick={onClick}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity", variantStyles[variant].split(' ')[0])} />
      <CardContent className="p-6 flex items-center gap-5 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110",
          variant === 'green' ? "bg-green-500/10 border-green-500/20" : 
          variant === 'red' ? "bg-red-500/10 border-red-500/20" : 
          variant === 'orange' ? "bg-orange-500/10 border-orange-500/20" :
          "bg-primary/10 border-primary/20",
          variantStyles[variant].split(' ')[1]
        )}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className={cn("text-2xl font-black leading-none", variantStyles[variant].split(' ').slice(2).join(' '))}>
              R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            {subtext && (
              <span className={cn("text-xs font-bold", variantStyles[variant].split(' ').slice(2).join(' '))}>
                {subtext}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

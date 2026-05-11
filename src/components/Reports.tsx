import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Transaction, UserProfile, PaymentFeeConfig, Product } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { startOfDay, endOfDay, subDays, format, differenceInDays, addDays } from 'date-fns';
import { DateRangePicker } from './DateRangePicker';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, Activity, Sparkles, ArrowUpRight, ArrowDownRight, Minus, PackageMinus, MessageSquare, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { cn, getShiftInterval, getShiftDate } from '../lib/utils';
import { geminiService } from '../services/geminiService';
import Markdown from 'react-markdown';

export function Reports({ user, setActiveTab }: { user: UserProfile, setActiveTab: (tab: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    income: 0, 
    expense: 0, 
    profit: 0, 
    grossProfit: 0, 
    grossMarginPct: 0,
    projectedProfit30d: 0 
  });
  const [abcData, setAbcData] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [extraData, setExtraData] = useState<any>({
    popularProducts: [],
    topCustomers: [],
    hourlyStats: []
  });
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<any[]>([]);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayLabel, setSelectedDayLabel] = useState('');
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [dateRange, setDateRange] = useState<{from: Date, to: Date}>({
    from: subDays(new Date(), 6),
    to: new Date()
  });

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || sendingChat) return;
    
    const userMsg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setSendingChat(true);
    
    try {
      const context = `
        Contexto do Bar (Últimos 7 dias):
        - Entradas em Caixa (Dinheiro/Cartão/Pix): R$ ${stats.income.toFixed(2)}
        - Vendas Totais (Incluindo Fiado): R$ ${dailyData.reduce((s, d) => s + (d.totalSalesValue || 0), 0).toFixed(2)}
        - Lucro Projetado (Competência): R$ ${stats.profit.toFixed(2)}
        - Margem Bruta Geral: ${stats.grossMarginPct.toFixed(1)}%
        - Top Produto Vendido: ${extraData.popularProducts[0] ? `${extraData.popularProducts[0].name} (${extraData.popularProducts[0].qty} un)` : 'Sem dados de volume (use comandas)'}
        - Top Produto (Margem): ${topProducts[0]?.name || 'N/A'} (${topProducts[0]?.margin?.toFixed(1) || '0.0'}%)
        - Melhores Horários: ${extraData.hourlyStats.length > 0 ? extraData.hourlyStats.slice(0, 3).map(h => h.hour).join(', ') : 'Sem dados'}
        - Clientes VIPs da Semana: ${extraData.topCustomers.length > 0 ? extraData.topCustomers.map(c => `${c.name} (R$ ${c.total.toFixed(2)})`).join(', ') : 'Sem dados'}
        
        Nota: As vendas em "FIADO" abatem estoque e geram custo, mas não entram no "Entradas em Caixa" até serem pagas. Trate o lucro como "Lucro Operacional" e se o caixa estiver baixo vs vendas, alerte sobre a inadimplência/fiados.
      `;
      
      const historyString = chatHistory.map(h => `${h.role === 'user' ? 'Usuário' : 'Co-CEO'}: ${h.content}`).join('\n');
      
      const prompt = `
        ${context}
        
        Histórico de conversa:
        ${historyString}
        
        Pergunta do Usuário: ${userMsg}
        
        Responda como o Orquestrador/Co-CEO do Boteco do Luis. Seja direto, utilize os dados acima se necessário e mantenha o tom profissional e focado em resultados. 
        
        Importante: Se houver registros de "Produto Desconhecido" nos dados, alerte o Luis sobre a necessidade urgente de categorizar corretamente os itens nas comandas para não perdermos o controle de rentabilidade e estoque.
      `;
      
      const result = await geminiService.generalTask(prompt, "Você é o Orquestrador Mestre do Boteco do Luis. Sua missão é maximizar o lucro, a eficiência operacional e garantir a precisão total dos dados.");
      setChatHistory(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      console.error("Error in AI chat:", error);
      toast.error("Erro ao consultar o Co-CEO");
    } finally {
      setSendingChat(false);
    }
  };

  const handleSmartAnalysis = async () => {
    setAnalyzing(true);
    try {
      const prompt = `
        Analise os seguintes dados estratégicos do meu bar (últimos 7 dias):
        
        1. Resumo Financeiro:
        - Entradas Reais (Cash Flow): R$ ${stats.income.toFixed(2)}
        - Vendas Operacionais (Volume Total): R$ ${dailyData.reduce((s, d) => s + (d.totalSalesValue || 0), 0).toFixed(2)}
        - Despesa Total (Incl. CMV e Taxas): R$ ${stats.expense.toFixed(2)}
        - Lucro Operacional: R$ ${stats.profit.toFixed(2)}
        - Margem Bruta Geral: ${stats.grossMarginPct.toFixed(1)}%
        
        2. Performance Diária (Vendas):
        ${JSON.stringify(dailyData.map(d => ({ date: d.fullDate, totalSales: d.totalSalesValue, cashIn: d.income })))}
        
        3. Produtos Mais Vendidos (Volume):
        ${extraData.popularProducts.length > 0 ? JSON.stringify(extraData.popularProducts) : 'ALERTA: Nenhuma comanda com itens registrada nos últimos 7 dias.'}
        
        4. Clientes que Mais Consumiram:
        ${extraData.topCustomers.length > 0 ? JSON.stringify(extraData.topCustomers) : 'Ainda não há dados vinculados a clientes específicos.'}
        
        5. Distribuição por Horário (Pico):
        ${extraData.hourlyStats.length > 0 ? JSON.stringify(extraData.hourlyStats) : 'Dados de horário indisponíveis.'}

        6. Produtos Mais Rentáveis (Base de Estoque):
        ${JSON.stringify(topProducts.map(p => ({ name: p.name, lucro_unitario: p.unitProfit, margem_pct: p.margin })))}
        
        Forneça uma análise estratégica "fina", com o tom de um Co-CEO (Boteco do Luis). 
        Se houver dados, identifique o cliente "vendedor do mês" (mais gastou), o produto "queridinho" e o horário de "rush".
        Se NÃO houver dados detalhados (volumes de produtos), explique ao Luis que para identificar o "carro-chefe" ele precisa fechar as vendas usando a funcionalidade de Comandas do sistema, pois as transações financeiras puras não detalham o que foi consumido.
        Dê 3 sugestões acionáveis para aumentar o lucro na próxima semana.
      `;
      const result = await geminiService.highThinkingTask(prompt, "Você é o Co-CEO e Orquestrador Mestre do Boteco do Luis. Sua análise deve ser técnica, estratégica e focada em lucro real.");
      setAiAnalysis(result);
    } catch (error) {
      console.error("Error in AI analysis:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchDailyDataByRange = async (range: {from: Date, to: Date}) => {
    setLoading(true);
    
    // Fetch Rates
    let rates: PaymentFeeConfig = { credit_pct: 0, debit_pct: 0, pix_pct: 0 };
    try {
      const docSnap = await getDoc(doc(db, 'payment_fees', 'config_rates'));
      if (docSnap.exists()) rates = docSnap.data() as PaymentFeeConfig;
    } catch (err) { console.error('Error fetching rates', err); }

    const daysCount = differenceInDays(range.to, range.from) + 1;
    
    if (daysCount > 31) {
      toast.error('Período muito longo', {
        description: 'Selecione no máximo 31 dias para evitar travamentos e perda de performance.'
      });
      setLoading(false);
      return;
    }

    const daysArray = Array.from({ length: daysCount }, (_, i) => addDays(range.from, i));

    const midDayFrom = new Date(range.from);
    midDayFrom.setHours(12, 0, 0, 0);
    const midDayTo = new Date(range.to);
    midDayTo.setHours(12, 0, 0, 0);

    const overallStart = getShiftInterval(midDayFrom).start;
    const overallEnd = getShiftInterval(midDayTo).end;

    const qTrans = query(collection(db, 'transactions'), where('date', '>=', Timestamp.fromDate(overallStart)), where('date', '<=', Timestamp.fromDate(overallEnd)));
    const qExp = query(collection(db, 'expenses'), where('date', '>=', Timestamp.fromDate(overallStart)), where('date', '<=', Timestamp.fromDate(overallEnd)));

    const fetchAllData = async () => {
      const [transSnapshot, expSnapshot] = await Promise.all([getDocs(qTrans), getDocs(qExp)]);
      const allTransactions = transSnapshot.docs.map(doc => doc.data() as Transaction);
      const allExpenses = expSnapshot.docs.map(doc => ({ ...doc.data() as Transaction, id: doc.id }));

      return daysArray.map(targetDate => {
        const midDay = new Date(targetDate);
        midDay.setHours(12, 0, 0, 0);
        const { start, end } = getShiftInterval(midDay);
        
        const dayTransactions = allTransactions.filter(t => {
          const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date as any);
          return tDate >= start && tDate <= end;
        });
        const dayExpenses = allExpenses.filter(t => {
          const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date as any);
          return tDate >= start && tDate <= end;
        });

        let rawIncome = 0;
        let paymentFees = 0;
        dayTransactions.filter(t => t.type === 'income' && !t.isFiado && !t.isSaldo).forEach(t => {
           rawIncome += t.amount;
           let pct = 0;
           const method = t.paymentMethod?.toUpperCase();
           if (method === 'CRÉDITO' || method === 'CREDITO') pct = rates.credit_pct || 0;
           else if (method === 'DÉBITO' || method === 'DEBITO') pct = rates.debit_pct || 0;
           else if (method === 'PIX') pct = rates.pix_pct || 0;
           paymentFees += t.feeAmount !== undefined ? t.feeAmount : ((t.amount * pct) / 100);
        });
        
        const totalSalesValue = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const cost = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.cost || 0), 0);
        const expenseFromTrans = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
        const totalDayExpense = expenseFromTrans + dayExpenses.reduce((s, t) => s + (t.amount || 0), 0) + paymentFees;

        return {
          date: targetDate,
          name: format(targetDate, 'EEE', { locale: ptBR }).toUpperCase(),
          fullDate: format(targetDate, 'dd/MM'),
          income: rawIncome,
          totalSalesValue,
          expense: totalDayExpense,
          cost,
          grossProfit: totalSalesValue - cost,
          profit: totalSalesValue - cost - totalDayExpense,
          grossMarginPct: totalSalesValue > 0 ? ((totalSalesValue - cost) / totalSalesValue) * 100 : 0
        };
      });
    };

    const fetchDeepAnalysisData = async () => {
      try {
        const fromStr = getShiftDate(midDayFrom);
        const toStr = getShiftDate(midDayTo);
        const qOrders = query(
          collection(db, 'open_orders'), 
          where('status', '==', 'closed'), 
          where('closedShiftDate', '>=', fromStr), 
          where('closedShiftDate', '<=', toStr)
        );
        const orderSnap = await getDocs(qOrders);
        const orders = orderSnap.docs.map(doc => doc.data());
        const productMap: Record<string, { name: string, qty: number, total: number }> = {};
        const customerMap: Record<string, { name: string, total: number, visits: number }> = {};
        const hourMap: Record<number, number> = {};
        
        orders.forEach(order => {
           const cName = order.customerName || 'Cliente Avulso';
           const cId = order.customerId || 'anonimo';
           if (!customerMap[cId]) customerMap[cId] = { name: cName, total: 0, visits: 0 };
           customerMap[cId].total += order.totalAmount || 0;
           customerMap[cId].visits += 1;
           (order.items || []).forEach((item: any) => {
              const pName = item.productName || item.name || item.product?.name || 'Produto Desconhecido';
              if (!productMap[pName]) productMap[pName] = { name: pName, qty: 0, total: 0 };
              productMap[pName].qty += item.quantity || 1;
              productMap[pName].total += item.totalPrice || ((item.price || 0) * (item.quantity || 1)) || 0;
           });
           if (order.closedAt) {
             const hour = order.closedAt.toDate ? order.closedAt.toDate().getHours() : new Date(order.closedAt).getHours();
             hourMap[hour] = (hourMap[hour] || 0) + 1;
           }
        });
        
        setExtraData({
          popularProducts: Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 10),
          topCustomers: Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 5),
          hourlyStats: Object.entries(hourMap).map(([h, count]) => ({ hour: `${h}h`, count })).sort((a, b) => b.count - a.count)
        });
      } catch (error) { console.error("Error in deep analysis:", error); }
    };

    const fetchTopProducts = async () => {
      try {
        const prodSnapshot = await getDocs(collection(db, 'products'));
        const products = prodSnapshot.docs.map(doc => ({ ...doc.data() as Product, id: doc.id }));
        const sorted = products
          .map(p => {
             let realCost = p.cost || 0;
             if (p.isDoseControl && p.linkedProductId && p.doseSize) {
                const parent = products.find(parentP => parentP.id === p.linkedProductId);
                if (parent && parent.volumePerUnit && parent.cost) {
                   realCost = (parent.cost / parent.volumePerUnit) * p.doseSize;
                }
             }
             const unitProfit = p.price - realCost;
             const margin = realCost > 0 ? (unitProfit / realCost) * 100 : (unitProfit > 0 ? 100 : 0);
             return {
                ...p,
                realCost,
                margin,
                unitProfit,
                potentialProfit: unitProfit * (p.stock || 0)
             };
          })
          .filter(p => p.unitProfit > 0)
          .sort((a, b) => b.unitProfit - a.unitProfit)
          .slice(0, 5);
        setTopProducts(sorted);
        const sortedByValue = products
          .filter(p => (p.price * (p.stock || 0)) > 0)
          .sort((a, b) => (b.price * (b.stock || 0)) - (a.price * (a.stock || 0)));
        const totalVal = sortedByValue.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
        let cumulative = 0;
        const abc = sortedByValue.map(p => {
          const val = p.price * (p.stock || 0);
          cumulative += val;
          const pct = totalVal > 0 ? (cumulative / totalVal) * 100 : 0;
          let group = 'C';
          if (pct <= 70) group = 'A'; else if (pct <= 90) group = 'B';
          return { ...p, value: val, accumulatedPct: pct, group };
        });
        setAbcData(abc);
      } catch (error) { console.error("Error fetching top products:", error); }
    };

    Promise.all([fetchAllData(), fetchDeepAnalysisData(), fetchTopProducts()]).then(([days]) => {
      setDailyData(days);
      const totalIncome = days.reduce((s, d) => s + d.income, 0);
      const totalExp = days.reduce((s, d) => s + d.expense, 0);
      const totalCost = days.reduce((s, d) => s + d.cost, 0);
      const totalSales = days.reduce((s, d) => s + d.totalSalesValue, 0);
      const profit = totalSales - totalCost - totalExp;
      setStats({
        income: totalIncome,
        expense: totalExp,
        profit,
        grossProfit: totalSales - totalCost,
        grossMarginPct: totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0,
        projectedProfit30d: (profit / Math.max(1, daysCount)) * 30
      });
      setLoading(false);
    });
  };

  const handleChartClick = async (data: any) => {
    if (!data || !data.activePayload) return;
    const dayInfo = data.activePayload[0].payload;
    setSelectedDayLabel(dayInfo.fullDate);
    setIsDayModalOpen(true);
    setLoadingTransactions(true);

    try {
      const midDay = new Date(dayInfo.date);
      midDay.setHours(12, 0, 0, 0);
      const { start, end } = getShiftInterval(midDay);

      const q = query(
        collection(db, 'transactions'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end))
      );
      const qExp = query(
        collection(db, 'expenses'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end))
      );

      const [snap, snapExp] = await Promise.all([getDocs(q), getDocs(qExp)]);
      const trans = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      const exps = snapExp.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'expense' }));
      
      setSelectedDayTransactions([...trans, ...exps].sort((a: any, b: any) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      }));
    } catch (error) {
      console.error("Error fetching day transactions:", error);
      toast.error("Erro ao carregar transações do dia");
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchDailyDataByRange(dateRange);
  }, [dateRange]);

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
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white leading-none mb-1">Business Intelligence</h2>
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
              <Activity className="w-3 h-3 text-primary" /> Relatórios operacionais e margens
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <DateRangePicker 
            onApply={(range) => range && setDateRange({ from: range.from, to: range.to })}
            initialRange={dateRange}
            className="md:w-[280px]"
          />
          <Button 
            className="h-12 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 font-black uppercase tracking-widest text-[10px] gap-2 rounded-xl px-6"
            onClick={handleSmartAnalysis}
            disabled={analyzing}
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gerar Insights AI
          </Button>
        </div>
      </div>

      {monthlySummary && (
        <Card 
          className="bg-primary/20 border-primary/30 rounded-2xl overflow-hidden cursor-pointer relative group transition-all active:scale-[0.99]"
          onClick={() => setActiveTab('finances')}
        >
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <CardHeader className="pb-3 md:pb-4 border-b border-primary/10 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xs md:text-sm font-black uppercase tracking-widest text-primary leading-none">Insights Estratégicos — {monthlySummary.month}</CardTitle>
                <p className="text-[8px] md:text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1">Resumo Consolidado Mensal</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              <div className="space-y-0.5">
                <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Volume</p>
                <p className="text-lg md:text-2xl font-black text-white">{monthlySummary.salesCount} <span className="text-[8px] md:text-[10px] text-primary">ORDENS</span></p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Receita</p>
                <p className="text-lg md:text-2xl font-black text-green-500">R$ {monthlySummary.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Despesas</p>
                <p className="text-lg md:text-2xl font-black text-red-500">R$ {monthlySummary.totalExpenses?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Margem</p>
                <p className="text-lg md:text-2xl font-black text-primary">R$ {(monthlySummary.totalRevenue - monthlySummary.totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Banner */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard 
          title="Entradas Caixa" 
          value={stats.income} 
          icon={<TrendingUp className="w-6 h-6 text-green-500" />} 
          variant="green"
          onClick={() => setActiveTab('finances')}
        />
        <StatCard 
          title="Despesa Geral" 
          value={stats.expense} 
          icon={<TrendingDown className="w-6 h-6 text-red-500" />} 
          variant="red"
          onClick={() => setActiveTab('finances')}
        />
        <StatCard 
          title="Lucro Líquido" 
          value={stats.profit} 
          icon={<DollarSign className="w-6 h-6 text-primary" />} 
          variant="blue"
          onClick={() => setActiveTab('finances')}
        />
        <StatCard 
          title="Proj. Mensal (30d)" 
          value={stats.projectedProfit30d} 
          icon={<TrendingUp className="w-6 h-6 text-purple-500" />} 
          variant="purple"
          subtext="ESTIMADO"
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Use o Gemini para analisar seus resultados semanais ou tirar dúvidas</p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setIsChatOpen(true)}
                className="flex-1 md:flex-none bg-indigo-500/10 text-indigo-500 border border-indigo-500/30 px-6 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                CONSULTAR IA
              </button>
              <button
                onClick={handleSmartAnalysis}
                disabled={analyzing}
                className="flex-1 md:flex-none bg-primary text-white px-6 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Top Margem de Lucro</CardTitle>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">Produtos mais Rentáveis</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground pl-6">Produto</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Preço</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right pr-6">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p: any) => (
                  <TableRow key={p.id} className="border-border hover:bg-white/5 transition-colors">
                    <TableCell className="pl-6">
                      <p className="text-xs font-bold uppercase">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">ESTOQUE: {p.stock}</p>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      R$ {(p.price || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-green-500/10 text-green-500 font-black text-xs">
                          R$ {(p.unitProfit || 0).toFixed(2)}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground">{p.margin.toFixed(0)}% MARGEM</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
            <div className="h-72 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <BarChart data={dailyData} onClick={handleChartClick}>
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
                    formatter={(value: number) => `R$ ${Number(value).toFixed(2)}`}
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
                  <Bar dataKey="totalSalesValue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="VENDAS TOTAIS" />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="ENTRADAS REAIS" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="SAÍDAS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-center text-muted-foreground uppercase tracking-widest mt-4 font-bold opacity-50">
              Clique em uma barra para ver o detalhamento do dia
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/50 rounded-2xl overflow-hidden mt-8">
        <CardHeader className="border-b border-border pb-4 bg-white/5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Curva ABC de Estoque</CardTitle>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">
                Classificação por Valor de Inventário (Importância Estratégica)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-1">Classe A (70%)</Badge>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-1">Classe B (20%)</Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-1">Classe C (10%)</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground pl-6">Posição</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Produto</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Valor em Estoque</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Acumulado %</TableHead>
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-center pr-6">Classe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abcData.slice(0, 15).map((item, idx) => (
                  <TableRow key={item.id} className="border-border hover:bg-white/5 transition-colors">
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{idx + 1}º</TableCell>
                    <TableCell>
                      <p className="text-xs font-bold uppercase">{item.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{item.stock} {item.unit || 'UN'} em estoque</p>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">
                      R$ {(item.value || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                      {(item.accumulatedPct || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <Badge className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1 border-none",
                        item.group === 'A' ? "bg-green-500/20 text-green-500" :
                        item.group === 'B' ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-red-500/20 text-red-500"
                      )}>
                        {item.group}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {abcData.length > 15 && (
              <div className="p-4 text-center bg-white/5">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Exibindo top 15 de {abcData.length} produtos ativos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                  <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Vendas</TableHead>
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
                      <TableCell className="text-right font-mono text-blue-500 font-bold">
                        R$ {day.totalSalesValue.toFixed(2)}
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
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0a0a] border-primary/20 p-0 overflow-hidden flex flex-col h-[600px]">
          <DialogHeader className="p-6 border-b border-white/5 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary">Consultoria Co-CEO IA</DialogTitle>
                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-0.5">Decisões baseadas em dados reais do seu negócio</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
             {chatHistory.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                 <MessageSquare className="w-12 h-12 text-primary/30" />
                 <div className="space-y-1">
                   <p className="text-xs font-bold uppercase tracking-widest">Inicie uma conversa estratégica</p>
                   <p className="text-[10px] uppercase tracking-widest leading-relaxed max-w-[280px]">
                     Pergunte sobre clientes, produtos mais vendidos ou sugestões de horários.
                   </p>
                 </div>
               </div>
             )}
             {chatHistory.map((msg, i) => (
               <div key={i} className={cn(
                 "flex flex-col max-w-[85%]",
                 msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
               )}>
                 <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                   {msg.role === 'user' ? 'Você' : 'Co-CEO'}
                 </span>
                 <div className={cn(
                   "p-4 rounded-2xl text-[11px] leading-relaxed",
                   msg.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-white/5 border border-white/10 text-white rounded-tl-none"
                 )}>
                   {msg.role === 'assistant' ? (
                     <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50">
                       <Markdown>{msg.content}</Markdown>
                     </div>
                   ) : msg.content}
                 </div>
               </div>
             ))}
             {sendingChat && (
               <div className="flex flex-col items-start mr-auto max-w-[85%]">
                 <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Co-CEO</span>
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10 rounded-tl-none flex items-center gap-2">
                   <div className="flex gap-1">
                     <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                     <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                     <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                 </div>
               </div>
             )}
          </div>

          <div className="p-6 bg-white/5 border-t border-white/5">
            <div className="relative group">
              <input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ex: Qual produto mais vendeu essa semana?"
                className="w-full bg-[#111] border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-4 py-3 text-xs placeholder:text-muted-foreground transition-all outline-none pr-12"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatMessage.trim() || sendingChat}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="max-w-4xl bg-[#0a0a0a] border-primary/20 p-0 overflow-hidden flex flex-col h-[80vh]">
          <DialogHeader className="p-6 border-b border-white/5 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary">Detalhamento do Dia {selectedDayLabel}</DialogTitle>
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-0.5">Todas as transações do expediente</p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary font-black px-4 py-1.5 rounded-lg uppercase tracking-tighter">
                {selectedDayTransactions.length} REGISTROS
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
            {loadingTransactions ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Buscando transações...</p>
              </div>
            ) : selectedDayTransactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                <Activity className="w-12 h-12 text-muted-foreground" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nenhuma transação encontrada neste dia.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-white/5 sticky top-0 z-10">
                  <TableRow className="border-white/10">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Hora</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Tipo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Descrição / Cliente</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Valor</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Método</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDayTransactions.map((t: any) => (
                    <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="pl-6 font-mono text-[11px] text-muted-foreground">
                        {t.date?.toDate ? format(t.date.toDate(), 'HH:mm') : '--:--'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 border-none",
                          t.type === 'income' ? (t.isFiado ? "bg-orange-500/20 text-orange-500" : "bg-green-500/20 text-green-500") : "bg-red-500/20 text-red-500"
                        )}>
                          {t.type === 'income' ? (t.isFiado ? 'FIADO' : 'VENDA') : 'DESPESA'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase truncate max-w-[200px]">{t.customerName || t.description || t.category || 'Venda Balcão'}</span>
                          {t.items && <span className="text-[9px] text-muted-foreground uppercase">{t.items.length} itens</span>}
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-mono text-xs font-bold",
                        t.type === 'income' ? "text-green-500" : "text-red-500"
                      )}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right pr-6 text-[10px] font-bold uppercase text-muted-foreground">
                        {t.paymentMethod || 'Dinheiro'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter className="p-4 bg-white/5 border-t border-white/5">
             <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest" onClick={() => setIsDayModalOpen(false)}>
               Fechar Detalhes
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon, variant, onClick, subtext }: { title: string, value: number, icon: React.ReactNode, variant: 'green' | 'red' | 'blue' | 'orange' | 'purple', onClick?: () => void, subtext?: string }) {
  const variantStyles = {
    green: "from-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.1)] text-green-500",
    red: "from-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)] text-red-500",
    blue: "from-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)] text-primary",
    orange: "from-orange-500/5 shadow-[0_0_20px_rgba(249,115,22,0.1)] text-orange-500",
    purple: "from-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.1)] text-purple-500"
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
          variant === 'purple' ? "bg-purple-500/10 border-purple-500/20" :
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

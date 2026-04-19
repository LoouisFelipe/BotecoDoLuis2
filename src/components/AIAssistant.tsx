import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { geminiService } from '../services/geminiService';
import { Bot, Send, Sparkles, Loader2, Shield, Info, Users, Target, Code, Database as DbIcon, CheckCircle, Lock, Zap, Globe, Activity, Package, TrendingUp, PlusCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import Markdown from 'react-markdown';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { startOfDay, endOfDay } from 'date-fns';
import { cn } from '../lib/utils';

const AGENTS = [
  { id: 'orchestrator', name: 'Orchestrator', icon: Bot, color: 'text-primary', description: 'Coordenação e síntese de resultados.' },
  { id: 'strategist', name: 'Product Strategist', icon: Target, color: 'text-purple-500', description: 'Visão de negócio e ROI.' },
  { id: 'frontend', name: 'Frontend Specialist', icon: Code, color: 'text-blue-500', description: 'UI/UX e Performance Client-side.' },
  { id: 'backend', name: 'Backend Specialist', icon: Zap, color: 'text-yellow-500', description: 'Lógica de servidor e APIs.' },
  { id: 'database', name: 'Database Architect', icon: DbIcon, color: 'text-green-500', description: 'Modelagem e integridade de dados.' },
  { id: 'quality', name: 'Quality Engineer', icon: CheckCircle, color: 'text-orange-500', description: 'Estabilidade e validação.' },
  { id: 'security', name: 'Security Auditor', icon: Lock, color: 'text-red-500', description: 'Auditoria e proteção de dados.' },
];

export function AIAssistant({ user }: { user: any }) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState('orchestrator');
  const [aiMode, setAiMode] = useState<'normal' | 'search' | 'thinking'>('normal');

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [productsSnap, ordersSnap, transSnap] = await Promise.all([
          getDocs(collection(db, 'products')),
          getDocs(query(collection(db, 'open_orders'), where('status', '==', 'open'))),
          getDocs(query(
            collection(db, 'transactions'),
            where('date', '>=', Timestamp.fromDate(startOfDay(new Date()))),
            where('date', '<=', Timestamp.fromDate(endOfDay(new Date())))
          ))
        ]);

        setContext({
          productCount: productsSnap.size,
          openOrdersCount: ordersSnap.size,
          todayTransactionsCount: transSnap.size,
          todayRevenue: transSnap.docs
            .filter(d => d.data().type === 'income')
            .reduce((sum, d) => sum + (d.data().amount || 0), 0)
        });
      } catch (error) {
        console.error("Error fetching context for AI:", error);
      }
    };
    fetchContext();
  }, []);

  const handleAsk = async (e?: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const activePrompt = overridePrompt || prompt;
    if (!activePrompt.trim()) return;

    setLoading(true);
    try {
      const agent = AGENTS.find(a => a.id === selectedAgent) || AGENTS[0];
      
      const systemInstruction = `
        Você é o ${agent.name} do Ecossistema de Agentes do Boteco do Luis.
        Sua responsabilidade principal é: ${agent.description}
        
        Contexto atual do bar:
        - Produtos no estoque: ${context?.productCount || 'Carregando...'}
        - Comandas abertas agora: ${context?.openOrdersCount || 'Carregando...'}
        - Vendas hoje: R$ ${context?.todayRevenue?.toFixed(2) || '0.00'}
        
        Instruções de Persona:
        - Se for Orchestrator: Sintetize a visão de todos os especialistas.
        - Se for Strategist: Foque em lucro, promoções e crescimento.
        - Se for Frontend/Backend: Foque na usabilidade do app e integrações.
        - Se for Database: Foque na organização das informações e segurança.
        
        Responda sempre em Português, de forma profissional e estratégica.
      `;

      let result = "";
      if (aiMode === 'search') {
        result = await geminiService.searchGroundedTask(activePrompt, systemInstruction);
      } else if (aiMode === 'thinking') {
        result = await geminiService.highThinkingTask(activePrompt, systemInstruction);
      } else {
        result = await geminiService.generalTask(activePrompt, systemInstruction);
      }

      setResponse(result || "Não foi possível gerar uma resposta.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao consultar o assistente.");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    "Dicas para reduzir desperdício de estoque",
    "Sugestões de promoções para happy hour",
    "Como melhorar o fluxo de caixa do bar",
    "Ideias de novos petiscos para o cardápio"
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase mb-1">Nexus Intelligence</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">IA Estratégica para o PDV Noturno</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/10">
            <Bot className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      {/* AI Context Insights - Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Stock Context</p>
              <h3 className="text-2xl font-black text-white leading-none">{context?.productCount || '...'} <span className="text-[10px] text-primary font-black">ITEMS</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Active Flow</p>
              <h3 className="text-2xl font-black text-white leading-none">{context?.openOrdersCount || '...'} <span className="text-[10px] text-blue-500 font-black">CLIENTS</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-green-500/20 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Today's Pulse</p>
              <h3 className="text-2xl font-black text-white leading-none">R$ {context?.todayRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card/30 border-border/50 overflow-hidden rounded-3xl">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Intelligence configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'normal', name: 'Normal', icon: Zap, color: 'text-blue-500', desc: 'Rápido e eficiente' },
                  { id: 'search', name: 'Search grounded', icon: Globe, color: 'text-green-500', desc: 'Dados da web' },
                  { id: 'thinking', name: 'Deep Thinking', icon: Activity, color: 'text-orange-500', desc: 'Raciocínio complexo' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setAiMode(mode.id as any)}
                    className={cn(
                      "flex flex-col items-start gap-4 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      aiMode === mode.id
                        ? "bg-primary/10 border-primary/40 text-primary shadow-lg shadow-primary/5"
                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    <mode.icon className={cn("w-6 h-6", aiMode === mode.id ? mode.color : "text-muted-foreground")} />
                    <div className="text-left">
                      <p className="leading-none mb-1">{mode.name}</p>
                      <p className="text-[8px] opacity-60 normal-case font-medium">{mode.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#0070f3] ml-1">Especialista Ativo</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AGENTS.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                        selectedAgent === agent.id
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                          : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      <agent.icon className="w-4 h-4" />
                      <span className="truncate">{agent.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/20 border-primary/30 rounded-[32px] overflow-hidden shadow-2xl">
            <CardHeader className="p-8 pb-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                  {(() => {
                    const AgentIcon = AGENTS.find(a => a.id === selectedAgent)?.icon || Bot;
                    return <AgentIcon className={cn("w-8 h-8", AGENTS.find(a => a.id === selectedAgent)?.color)} />;
                  })()}
                </div>
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tighter mb-1">
                    Consultar {AGENTS.find(a => a.id === selectedAgent)?.name}
                  </CardTitle>
                  <CardDescription className="text-primary font-bold text-[10px] uppercase tracking-widest opacity-70">
                    {AGENTS.find(a => a.id === selectedAgent)?.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <form onSubmit={(e) => handleAsk(e)} className="flex gap-3">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Digite sua dúvida estratégica aqui...`}
                  className="h-16 flex-1 bg-card/80 border-white/10 focus:ring-primary/20 focus:border-primary text-lg font-bold rounded-2xl placeholder:opacity-50"
                  disabled={loading}
                />
                <Button 
                  type="submit" 
                  disabled={loading || !prompt.trim()} 
                  className="w-16 h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 active:scale-95 transition-all"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                </Button>
              </form>
            </CardContent>
          </Card>

          {response && (
            <Card className="bg-card/30 border-border/50 rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8 pb-4">
                <div className="flex items-center gap-3 text-primary font-black text-[10px] tracking-[0.2em] uppercase">
                  <Activity className="w-4 h-4" />
                  Nexus Analysis Report
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="prose prose-invert max-w-none prose-p:text-sm prose-p:leading-relaxed prose-p:text-white/80 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest">
                  <Markdown>{response}</Markdown>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          <Card className="bg-card/30 border-border/50 rounded-3xl overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sugestões de Análise</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {quickActions.map((action, i) => (
                <button
                  key={`quick-action-${i}`}
                  className="w-full text-left p-4 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-primary/20 transition-all group flex items-start gap-3"
                  onClick={() => {
                    setPrompt(action);
                    handleAsk(undefined, action);
                  }}
                >
                  <PlusCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                  <span className="text-xs font-bold text-muted-foreground group-hover:text-white transition-colors">{action}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20 border-dashed rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/30">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-1">Nexus Security</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-bold">
                    Suas consultas são privadas e protegidas. A IA atua como um consultor interno do bar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { geminiService } from '../services/geminiService';
import { Bot, Send, Sparkles, Loader2, Shield, Info, Users, Target, Code, Database as DbIcon, CheckCircle, Lock, Zap } from 'lucide-react';
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
      const result = await geminiService.generateResponse(activePrompt, systemInstruction);
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ASSISTENTE IA</h1>
          <p className="text-muted-foreground">Inteligência artificial para potencializar o Boteco do Luis</p>
        </div>
        <div className="bg-primary/10 p-3 rounded-full">
          <Bot className="w-8 h-8 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Selecione o Especialista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {AGENTS.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                      selectedAgent === agent.id
                        ? "bg-primary/20 border-primary text-primary shadow-sm"
                        : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    <agent.icon className={cn("w-3 h-3", selectedAgent === agent.id ? agent.color : "text-muted-foreground")} />
                    {agent.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const AgentIcon = AGENTS.find(a => a.id === selectedAgent)?.icon || Bot;
                  return <AgentIcon className={cn("w-5 h-5", AGENTS.find(a => a.id === selectedAgent)?.color)} />;
                })()}
                Consultar {AGENTS.find(a => a.id === selectedAgent)?.name}
              </CardTitle>
              <CardDescription>{AGENTS.find(a => a.id === selectedAgent)?.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => handleAsk(e)} className="flex gap-2">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Perguntar ao ${AGENTS.find(a => a.id === selectedAgent)?.name}...`}
                  className="flex-1"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !prompt.trim()} aria-label="Enviar pergunta">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
              
              {context && (
                <div className="mt-4 flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {context.productCount} PRODUTOS
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {context.openOrdersCount} COMANDAS ATIVAS
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    HOJE: R$ {context.todayRevenue.toFixed(2)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {response && (
            <Card className="border-border bg-card/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-widest uppercase">
                  {(() => {
                    const AgentIcon = AGENTS.find(a => a.id === selectedAgent)?.icon || Bot;
                    return <AgentIcon className={cn("w-4 h-4", AGENTS.find(a => a.id === selectedAgent)?.color)} />;
                  })()}
                  Análise do {AGENTS.find(a => a.id === selectedAgent)?.name}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                  <Markdown>{response}</Markdown>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action, i) => (
                <Button
                  key={`quick-action-${i}`}
                  variant="outline"
                  className="w-full justify-start text-xs text-left h-auto py-3 px-4 hover:bg-primary/5 hover:text-primary transition-all"
                  onClick={() => {
                    setPrompt(action);
                    handleAsk(undefined, action);
                  }}
                >
                  {action}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1">Dica do Especialista</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    A IA analisa tendências de mercado para bares. Use-a para planejar seu estoque com base em feriados e eventos esportivos.
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


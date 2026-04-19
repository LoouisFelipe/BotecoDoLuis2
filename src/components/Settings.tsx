import { UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { User, Shield, Bell, Database, Info } from 'lucide-react';
import { auth } from '../firebase';

export function Settings({ user }: { user: UserProfile }) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="pb-4">
        <h1 className="text-3xl font-black tracking-tighter uppercase mb-1">Nexus Configuration</h1>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Gerencie as diretrizes estratégicas e operacionais do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-card/30 border-border/50 overflow-hidden rounded-[32px] group relative shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-8 relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-[32px] bg-white/5 flex items-center justify-center border border-white/10 shadow-inner mb-6 group-hover:scale-105 transition-transform duration-500">
                <User className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-1">{user.displayName || user.email.split('@')[0]}</h3>
              <div className="flex items-center gap-2 mb-4">
                 <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-black tracking-widest uppercase">
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role}
                 </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mb-8">{user.email}</p>
              
              <Button 
                variant="outline" 
                className="w-full h-14 border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all"
                onClick={() => auth.signOut()}
              >
                Encerrar Operação
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-border/50 rounded-[32px] overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <Info className="w-4 h-4" />
                System manifest
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="space-y-4">
                {[
                  { label: 'Version', value: 'v2.4.0-PROD' },
                  { label: 'Data Hub', value: 'Nexus v360' },
                  { label: 'Engine', value: 'Gemini 3 Flash' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</span>
                    <span className="text-[10px] font-mono font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-8">
          <Card className="bg-card/30 border-border/50 rounded-[32px] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <Shield className="w-5 h-5" />
                Segurança & Governança
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-primary/20 transition-all group">
                  <p className="text-xs font-black uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">2FA Protocol</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-4">Autenticação Biométrica/OTP</p>
                  <Badge className="opacity-40 border-white/10">Pipeline</Badge>
                </div>
                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-primary/20 transition-all group flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Access Logs</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Rastreabilidade completa</p>
                  </div>
                  <Button variant="ghost" className="h-10 mt-4 text-[10px] font-black uppercase tracking-widest border border-white/5 hover:bg-white/5">Visualizar</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-border/50 rounded-[32px] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-[#0070f3]">
                <Database className="w-5 h-5" />
                Data Integrity & Cold Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-[#0070f3]/5 rounded-2xl border border-[#0070f3]/10 gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-tight text-[#0070f3]">Backup Estrutural (JSON)</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Exportação local de todo o ecossistema</p>
                </div>
                <Button className="w-full sm:w-auto h-12 px-8 font-black uppercase tracking-widest bg-[#0070f3] hover:bg-[#0070f3]/90 rounded-xl shadow-lg shadow-[#0070f3]/20">Download</Button>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white/[0.02] rounded-2xl border border-white/5 gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-tight">Otimização de Cache</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Limpar resíduos de renderização local</p>
                </div>
                <Button variant="ghost" className="w-full sm:w-auto h-12 px-8 font-black uppercase tracking-widest border border-white/5 hover:bg-white/5 rounded-xl">Executar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${className}`}>
      {children}
    </span>
  );
}

import { UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { User, Shield, Bell, Database, Info } from 'lucide-react';
import { auth } from '../firebase';

export function Settings({ user }: { user: UserProfile }) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight uppercase">Ajustes do Sistema</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e configurações do BarDoLuis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <Card className="border-border bg-card/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 mb-4">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-bold text-lg">{user.displayName || 'Usuário'}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{user.role}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{user.email}</p>
                
                <Button 
                  variant="outline" 
                  aria-label="Sair da Conta"
                  title="Sair da Conta"
                  className="mt-6 w-full border-red-500/20 text-red-500 hover:bg-red-500/10"
                  onClick={() => auth.signOut()}
                >
                  Sair da Conta
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Sobre o Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground">Versão</span>
                  <span>v2.4.0-PROD</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground">Build</span>
                  <span>2026.04.11</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground">Engine</span>
                  <span>Gemini 3 Flash</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Segurança & Acesso
              </CardTitle>
              <CardDescription>Configurações de permissões e controle de acesso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-bold uppercase tracking-tight">Autenticação de Dois Fatores</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Proteção extra para sua conta</p>
                </div>
                <Badge variant="outline" className="opacity-50">Em breve</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-bold uppercase tracking-tight">Logs de Atividade</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Histórico de ações no sistema</p>
                </div>
                <Button variant="ghost" size="sm" aria-label="Ver Logs de Atividade" className="text-[10px] font-bold uppercase tracking-widest">Ver Logs</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Dados & Backup
              </CardTitle>
              <CardDescription>Gerencie a integridade e persistência dos seus dados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-bold uppercase tracking-tight">Exportar Dados (JSON)</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Baixar backup completo do banco</p>
                </div>
                <Button variant="outline" size="sm" aria-label="Exportar Dados em JSON" className="text-[10px] font-bold uppercase tracking-widest">Exportar</Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-bold uppercase tracking-tight">Limpeza de Cache</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Otimizar performance local</p>
                </div>
                <Button variant="ghost" size="sm" aria-label="Limpar Cache Local" className="text-[10px] font-bold uppercase tracking-widest">Limpar</Button>
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

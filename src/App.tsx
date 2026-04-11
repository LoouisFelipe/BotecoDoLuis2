/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { AuthWrapper } from './components/AuthWrapper';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Finances } from './components/Finances';
import { Reports } from './components/Reports';
import { Games } from './components/Games';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';
import { MigrationTool } from './components/MigrationTool';
import { AIAssistant } from './components/AIAssistant';
import { Settings as SettingsComponent } from './components/Settings';
import { LayoutDashboard, Package, Receipt, BarChart3, LogOut, Shield, Users, Truck, Settings, Gamepad2, User, Sparkles, Activity, Globe, Database } from 'lucide-react';
import { auth } from './firebase';
import { Button } from './components/ui/button';
import { useState } from 'react';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'CONTROLE DIÁRIO', icon: LayoutDashboard },
    { id: 'finances', label: 'FINANCEIRO', icon: Receipt },
    { id: 'inventory', label: 'PRODUTOS', icon: Package },
    { id: 'reports', label: 'RELATÓRIOS', icon: BarChart3 },
    { id: 'ai', label: 'ASSISTENTE IA', icon: Sparkles },
  ];

  const secondaryItems = [
    { id: 'games', label: 'BANCA JOGOS', icon: Gamepad2 },
    { id: 'clients', label: 'CLIENTES', icon: Users },
    { id: 'suppliers', label: 'FORNECEDORES', icon: Truck },
    { id: 'users', label: 'USUÁRIOS', icon: User },
    { id: 'migration', label: 'MIGRAÇÃO', icon: Database },
    { id: 'settings', label: 'AJUSTES', icon: Settings },
  ];

  return (
    <ErrorBoundary>
      <AuthWrapper>
        {(user) => (
          <div className="min-h-screen bg-background flex text-foreground">
            {/* Sidebar */}
            <aside className="w-64 bg-sidebar border-r border-border flex flex-col sticky top-0 h-screen">
              <div className="p-6 flex items-center gap-3">
                <div className="bg-primary p-2 rounded-lg">
                  <Shield className="text-white w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-tight">BarDoLuis</h1>
                  <p className="text-[10px] text-sidebar-foreground tracking-widest uppercase font-semibold">Gestão Estratégica</p>
                </div>
              </div>

              <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto">
                <div>
                  <p className="text-[10px] font-bold text-sidebar-foreground mb-4 px-2 tracking-widest uppercase">Menu Principal</p>
                  <div className="space-y-1">
                    {menuItems.map((item) => (
                      <button
                        key={`nav-main-${item.id}`}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all",
                          activeTab === item.id 
                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                            : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  {secondaryItems.map((item) => (
                    <button
                      key={`nav-sec-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all",
                        activeTab === item.id 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </nav>

              <div className="p-4 border-t border-border space-y-4">
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] font-bold tracking-widest uppercase">Data Hub Ativo</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground uppercase font-bold">
                      <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Firestore</span>
                      <span className="text-green-500">Online</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground uppercase font-bold">
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> API Gateway</span>
                      <span className="text-green-500">Stable</span>
                    </div>
                  </div>
                </div>

                <div className="px-2">
                  <p className="text-[8px] text-muted-foreground font-bold tracking-[0.2em] uppercase mb-1 opacity-50">Versão do Sistema</p>
                  <p className="text-[10px] font-mono text-muted-foreground">v2.4.0-PROD</p>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-white/5 p-2 rounded-lg">
                    <LayoutDashboard className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg uppercase tracking-wider">
                      {menuItems.find(i => i.id === activeTab)?.label || 
                       secondaryItems.find(i => i.id === activeTab)?.label || 
                       'CONTROLE DIÁRIO'}
                    </h2>
                    <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">Data Hub Ativo</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">{user.displayName || user.email}</p>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest">ADM</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => auth.signOut()}
                    className="hover:bg-red-500/10 hover:text-red-500"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </header>

              <main className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'dashboard' && <Dashboard user={user} />}
                {activeTab === 'inventory' && <Inventory user={user} />}
                {activeTab === 'finances' && <Finances user={user} />}
                {activeTab === 'reports' && <Reports user={user} />}
                {activeTab === 'ai' && <AIAssistant user={user} />}
                {activeTab === 'games' && <Games user={user} />}
                {activeTab === 'clients' && <Customers user={user} />}
                {activeTab === 'suppliers' && <Suppliers user={user} />}
                {activeTab === 'migration' && <MigrationTool />}
                {activeTab === 'settings' && <SettingsComponent user={user} />}
              </main>
            </div>
            <Toaster position="top-right" />
          </div>
        )}
      </AuthWrapper>
    </ErrorBoundary>
  );
}


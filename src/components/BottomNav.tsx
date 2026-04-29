import React from 'react';
import { LayoutDashboard, Receipt, Gamepad2, Package, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.split('/')[1];

  const navItems = [
    { id: 'dashboard', label: 'CONTROLE', icon: LayoutDashboard, path: '/' },
    { id: 'finances', label: 'FINANCEIRO', icon: Receipt, path: '/finances' },
    { id: 'games', label: 'BANCA', icon: Gamepad2, path: '/games' },
    { id: 'inventory', label: 'PRODUTOS', icon: Package, path: '/inventory' },
    { id: 'clients', label: 'CLIENTES', icon: Users, path: '/clients' },
  ];

  const handleNav = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
      <div className="bg-[#0d1117]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-2 flex items-center justify-between shadow-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id || (item.id === 'dashboard' && location.pathname === '/');
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 rounded-2xl",
                isActive ? "bg-[#0070f3] text-white shadow-lg shadow-[#0070f3]/20" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-6 h-6 mb-1", isActive ? "scale-110" : "scale-100")} />
              </div>
              <span className={cn(
                "text-[9px] font-black tracking-widest uppercase transition-all",
                isActive ? "opacity-100 translate-y-0" : "opacity-60"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

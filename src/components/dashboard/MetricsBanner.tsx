import React from 'react';
import { Card, CardContent } from '../ui/card';
import { PlusCircle, Clock, TrendingUp, Zap, Activity } from 'lucide-react';
import { Order } from '../../types';
import { useNavigate } from 'react-router-dom';

interface MetricsBannerProps {
  orders: Order[];
  onNewOrder: () => void;
}

export function MetricsBanner({ orders, onNewOrder }: MetricsBannerProps) {
  const navigate = useNavigate();

  const openAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const ticketMedio = orders.length > 0 ? openAmount / orders.length : 0;
  const projectedProfit = orders.reduce((sum, o) => {
    const orderCost = (o.items || []).reduce((cSum, i) => cSum + ((i.costPrice || 0) * i.quantity), 0);
    return sum + ((o.totalAmount || 0) - orderCost);
  }, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
      <Card className="bg-card/30 border-border/50 overflow-hidden relative group cursor-pointer" onClick={onNewOrder}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0070f3]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-4 md:p-6 flex items-center gap-4 md:gap-5 relative z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#0070f3]/10 flex items-center justify-center border border-[#0070f3]/20 shadow-[0_0_20px_rgba(0,112,243,0.1)] group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5 md:w-6 md:h-6 text-[#0070f3]" />
          </div>
          <div>
            <p className="text-[8px] md:text-[9px] font-black tracking-widest uppercase text-muted-foreground mb-1 leading-none">Ponto de Venda</p>
            <h3 className="text-xs md:text-lg font-black text-white leading-none">NOVA COMANDA</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-4 md:p-6 flex items-center gap-4 md:gap-5 relative z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-[8px] md:text-[9px] font-black tracking-widest uppercase text-muted-foreground mb-1 leading-none">Mesas Ativas</p>
            <h3 className="text-lg md:text-2xl font-black text-white leading-none">{orders.length}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/30 border-border/50 overflow-hidden relative group cursor-pointer" onClick={() => navigate('/finances')}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0070f3]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-4 md:p-6 flex items-center gap-4 md:gap-5 relative z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#0070f3]/10 flex items-center justify-center border border-[#0070f3]/20">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-[#0070f3]" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] md:text-[9px] font-black tracking-widest uppercase text-muted-foreground mb-1 leading-none">Valor em Aberto</p>
            <h3 className="text-base md:text-2xl font-black text-[#0070f3] leading-none truncate font-mono tabular-nums">
              R$ {openAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-4 md:p-6 flex items-center gap-4 md:gap-5 relative z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <Zap className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] md:text-[9px] font-black tracking-widest uppercase text-muted-foreground mb-1 leading-none">Ticket Médio</p>
             <h3 className="text-base md:text-2xl font-black text-green-500 leading-none truncate font-mono tabular-nums">
              R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-4 md:p-6 flex items-center gap-4 md:gap-5 relative z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Activity className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] md:text-[9px] font-black tracking-widest uppercase text-muted-foreground mb-1 leading-none">Lucro Projetado</p>
            <h3 className="text-base md:text-2xl font-black text-indigo-500 leading-none truncate font-mono tabular-nums">
              R$ {projectedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

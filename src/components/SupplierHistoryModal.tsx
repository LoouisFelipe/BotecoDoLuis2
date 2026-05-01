import React from 'react';
import { Purchase, Supplier } from '../types';
import { useFetchCollection } from '../hooks/useFetchCollection';
import { orderBy, where } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShoppingBag, Calendar, ArrowRight, Package, Activity } from 'lucide-react';
import { Badge } from './ui/badge';

interface SupplierHistoryModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierHistoryModal({ supplier, isOpen, onOpenChange }: SupplierHistoryModalProps) {
  const constraints = React.useMemo(() => [
    where('supplierId', '==', supplier?.id || ''),
    orderBy('date', 'desc')
  ], [supplier?.id]);

  const { data: purchases, loading } = useFetchCollection<Purchase>('purchases', {
    constraints,
    enabled: !!supplier && isOpen
  });

  const stats = React.useMemo(() => {
    if (purchases.length === 0) return { total: 0, avg: 0, count: 0 };
    const total = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    return {
      total,
      avg: total / purchases.length,
      count: purchases.length
    };
  }, [purchases]);

  const parseSafeDate = (d: any): Date | null => {
    if (!d) return null;
    try {
      const date = d.toDate ? d.toDate() : new Date(d);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b1120] border-white/10 max-w-5xl text-white p-0 overflow-hidden flex flex-col h-[95vh] md:h-[90vh]">
        {/* Superior Banner - Technical Look */}
        <div className="p-6 md:p-10 border-b border-white/5 bg-gradient-to-br from-primary/10 via-transparent to-transparent flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <ShoppingBag className="w-7 h-7 md:w-10 md:h-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] font-black uppercase tracking-[0.2em] px-2">Histórico Técnico</Badge>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{supplier?.category || 'GERAL'}</span>
                </div>
                <DialogTitle className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                  {supplier?.name}
                </DialogTitle>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:flex gap-4 md:gap-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Investimento</p>
                <p className="text-xl md:text-2xl font-black text-white font-mono">R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ticket Médio</p>
                <p className="text-xl md:text-2xl font-black text-primary font-mono tabular-nums">R$ {stats.avg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar bg-black/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Sincronizando Dados...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-32 bg-white/[0.02] rounded-[40px] border border-dashed border-white/5">
              <Package className="w-20 h-20 mx-auto mb-6 text-white/5" />
              <p className="font-black tracking-[0.3em] uppercase text-sm text-muted-foreground">Volume de pedidos inexistente</p>
              <p className="text-[10px] uppercase tracking-widest mt-2 opacity-50">Registre sua primeira compra para iniciar o rastreio</p>
            </div>
          ) : (
            <div className="space-y-12">
              {purchases.map((purchase, pIdx) => (
                <div key={purchase.id} className="relative group">
                  {/* Timeline logic indicator */}
                  <div className="absolute -left-10 top-0 bottom-0 w-px bg-white/5 hidden md:block" />
                  <div className="absolute -left-[45px] top-4 w-10 h-10 rounded-full bg-[#0b1120] border-2 border-white/5 flex items-center justify-center hidden md:flex font-black text-[10px] text-muted-foreground group-hover:border-primary/50 transition-colors">
                    {purchases.length - pIdx}
                  </div>

                  <div className="bg-[#0f172a]/40 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl hover:border-primary/20 transition-all">
                    <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02]">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Registro de Operação</p>
                          <p className="text-lg font-black text-white uppercase tracking-tight">
                            {parseSafeDate(purchase.date) ? format(parseSafeDate(purchase.date)!, "dd 'DE' MMMM, yyyy", { locale: ptBR }) : '---'}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 md:px-8 bg-black/40 rounded-2xl border border-white/5 text-right">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Valor do Lote</p>
                        <p className="text-2xl font-black text-white font-mono tabular-nums">R$ {purchase.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    
                    <div className="p-6 md:p-8">
                       <div className="flex items-center gap-3 mb-6">
                         <div className="h-px flex-1 bg-white/5" />
                         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Especificação de Itens</span>
                         <div className="h-px flex-1 bg-white/5" />
                       </div>
                       
                       <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-transparent">
                            <TableRow className="border-white/5 hover:bg-transparent">
                              <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground h-10">Artigo / SKU</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground h-10 text-center">Quant.</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground h-10 text-right">Unidade</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground h-10 text-right">Montante</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchase.items.map((item, idx) => (
                              <TableRow key={`${purchase.id}-item-${idx}`} className="border-white/5 hover:bg-white/[0.03] transition-colors group/row">
                                <TableCell className="py-4 font-black text-xs uppercase tracking-tight text-white/80 group-hover/row:text-white transition-colors">{item.productName}</TableCell>
                                <TableCell className="py-4 text-center">
                                  <Badge className="bg-white/5 border-white/10 text-white text-[10px] font-black font-mono px-3">{item.quantity}</Badge>
                                </TableCell>
                                <TableCell className="py-4 text-right text-[11px] font-mono text-muted-foreground">R$ {item.price.toFixed(2)}</TableCell>
                                <TableCell className="py-4 text-right text-xs font-black font-mono text-primary group-hover/row:scale-105 transition-transform origin-right">R$ {item.subtotal.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

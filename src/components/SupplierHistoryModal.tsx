import React from 'react';
import { Purchase, Supplier } from '../types';
import { useFetchCollection } from '../hooks/useFetchCollection';
import { orderBy, where } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShoppingBag, Calendar, ArrowRight, Package } from 'lucide-react';
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b1120] border-border max-w-4xl text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-1">
                Histórico de <span className="text-primary">Compras</span>
              </DialogTitle>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                Fornecedor: <span className="text-white">{supplier?.name}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="font-bold tracking-widest uppercase text-muted-foreground">Nenhuma compra registrada para este fornecedor.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden hover:bg-white/[0.05] transition-all group">
                  <div className="p-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/5 p-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data da Compra</p>
                        <p className="text-sm font-black text-white uppercase">
                          {purchase.date?.toDate ? format(purchase.date.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Data Indisponível'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Valor Investido</p>
                      <p className="text-xl font-black text-primary">R$ {purchase.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <Table>
                      <TableHeader className="bg-transparent border-none">
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-[9px] font-bold uppercase tracking-widest h-8">Produto</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase tracking-widest h-8 text-center">Qtd</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase tracking-widest h-8 text-right">Preço Un.</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase tracking-widest h-8 text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchase.items.map((item, idx) => (
                          <TableRow key={`${purchase.id}-item-${idx}`} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="py-3 font-bold text-xs uppercase tracking-tight">{item.productName}</TableCell>
                            <TableCell className="py-3 text-center text-xs font-mono">{item.quantity}</TableCell>
                            <TableCell className="py-3 text-right text-xs font-mono">R$ {item.price.toFixed(2)}</TableCell>
                            <TableCell className="py-3 text-right text-xs font-mono font-bold text-primary">R$ {item.subtotal.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

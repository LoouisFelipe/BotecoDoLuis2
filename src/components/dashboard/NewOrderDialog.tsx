import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Plus, UserPlus, Zap, Package, UserCheck, X } from 'lucide-react';
import { Customer } from '../../types';

interface NewOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onCreateOrder: (name: string, type: 'table' | 'customer', customerId?: string, isNewCustomer?: boolean) => Promise<void>;
  isCreating: boolean;
}

export function NewOrderDialog({ 
  isOpen, 
  onOpenChange, 
  customers, 
  onCreateOrder, 
  isCreating 
}: NewOrderDialogProps) {
  const [newCustomerName, setNewCustomerName] = useState('');

  const handleClose = () => {
    setNewCustomerName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) setNewCustomerName('');
    }}>
      <DialogTrigger nativeButton={true} render={
        <Button className="h-16 px-8 bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[#0070f3]/20 gap-2 hidden md:flex">
          <Plus className="w-5 h-5" />
          ABRIR COMANDA
        </Button>
      } />
      {/* FAB for Mobile */}
      <DialogTrigger nativeButton={true} render={
        <button className="md:hidden fixed bottom-24 right-6 w-16 h-16 bg-[#0070f3] text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-transform">
          <Plus className="w-8 h-8" />
        </button>
      } />
      <DialogContent className="bg-[#05070a] border-none max-w-2xl text-white p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl rounded-[40px]">
        <div className="p-6 md:p-8 border-b border-white/5 relative flex-shrink-0 bg-[#05070a]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0070f3]/10 flex items-center justify-center border border-[#0070f3]/20 shadow-lg">
              <UserPlus className="w-7 h-7 text-[#0070f3]" />
            </div>
            <div>
              <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">Nova Comanda</DialogTitle>
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#0070f3]/60 flex items-center gap-2">
                <Zap className="w-3 h-3" /> Inicie o atendimento operacional
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black tracking-widest uppercase text-[#0070f3] ml-1">Para quem é esta comanda?</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-[#0070f3] transition-colors" />
              <Input 
                placeholder="NOME DO CLIENTE, MESA OU BALCÃO..." 
                className="h-20 pl-14 bg-[#0d1117] border-white/5 focus:ring-[#0070f3]/20 focus:border-[#0070f3] text-xl md:text-2xl font-black rounded-2xl uppercase tracking-tight shadow-inner"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Digite qualquer coisa e o sistema irá sugerir as melhores opções abaixo</p>
          </div>

          <div className="space-y-4">
            {newCustomerName.trim().length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                 {['MESA 01', 'MESA 02', 'MESA 03', 'BALCÃO'].map(sug => (
                  <button 
                    key={sug}
                    onClick={() => onCreateOrder(sug, 'table')}
                    disabled={isCreating}
                    className="py-6 px-4 bg-[#0d1117] hover:bg-[#161b22] border border-white/5 disabled:opacity-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex flex-col items-center gap-2"
                  >
                    <Package className="w-6 h-6 text-muted-foreground" />
                    {sug}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* 1. Mesa / Balcão Option */}
                <button 
                  onClick={() => onCreateOrder(newCustomerName, 'table')}
                  disabled={isCreating}
                  className="w-full p-4 bg-[#0d1117] hover:bg-[#161b22] border border-[#0070f3]/20 disabled:opacity-50 rounded-2xl text-left transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                       <Package className="w-5 h-5 text-white/50 group-hover:text-[#0070f3] transition-colors" />
                     </div>
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-[#0070f3] mb-1">Mesa / Balcão (Sem Cadastro)</p>
                       <p className="text-lg font-black uppercase tracking-widest">{newCustomerName}</p>
                     </div>
                  </div>
                  <Plus className="w-6 h-6 text-muted-foreground group-hover:text-white" />
                </button>

                {/* 2. Cliente Fiel (Matching ones) */}
                {customers
                  .filter(c => c.name.toUpperCase().includes(newCustomerName.toUpperCase()))
                  .map(customer => (
                    <button 
                      key={customer.id}
                      onClick={() => onCreateOrder(customer.name, 'customer', customer.id)}
                      disabled={isCreating}
                      className="w-full p-4 bg-[#0d1117] hover:bg-[#161b22] border border-green-500/20 disabled:opacity-50 rounded-2xl text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                           <UserCheck className="w-5 h-5 text-green-500" />
                         </div>
                         <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Cliente Fiel Localizado</p>
                           <p className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                             {customer.name}
                             {(customer.balance || 0) < 0 && (
                               <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded-md text-[10px]">DÉBITO R$ {Math.abs(customer.balance || 0).toFixed(2)}</span>
                             )}
                             {(customer.balance || 0) > 0 && (
                               <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-md text-[10px]">CRÉDITO R$ {(customer.balance || 0).toFixed(2)}</span>
                             )}
                           </p>
                         </div>
                      </div>
                      <Plus className="w-6 h-6 text-muted-foreground group-hover:text-white" />
                    </button>
                  ))
                }

                {/* 3. New Customer Option (Only if exact match doesn't exist) */}
                {!customers.some(c => c.name.toUpperCase() === newCustomerName.toUpperCase()) && (
                  <button 
                    onClick={() => onCreateOrder(newCustomerName, 'customer', '', true)}
                    disabled={isCreating}
                    className="w-full p-4 bg-[#0d1117] hover:bg-[#161b22] border border-amber-500/20 disabled:opacity-50 rounded-2xl text-left transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                         <UserPlus className="w-5 h-5 text-amber-500" />
                       </div>
                       <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Cadastrar e Abrir Comanda</p>
                         <p className="text-lg font-black uppercase tracking-widest">{newCustomerName}</p>
                       </div>
                    </div>
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-white" />
                  </button>
                )}

              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 md:p-8 border-t border-white/5 bg-[#05070a] flex-row gap-4 flex-shrink-0">
          <Button variant="ghost" onClick={handleClose} disabled={isCreating} className="flex-1 max-w-[200px] h-16 font-black uppercase tracking-widest text-muted-foreground hover:text-white rounded-2xl">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

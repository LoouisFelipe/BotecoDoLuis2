import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Supplier, UserProfile, Purchase } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Truck, Plus, Search, Phone, Tag, Edit2, Trash2, Mail, MapPin, Users, ShoppingCart, BarChart3, Activity } from 'lucide-react';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { format } from '../lib/utils';
import { ptBR } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { ConfirmDialog } from './ConfirmDialog';
import { RegisterPurchaseModal } from './RegisterPurchaseModal';
import { SupplierHistoryModal } from './SupplierHistoryModal';

import { useData } from '../contexts/DataContext';
import { useFetchCollection } from '../hooks/useFetchCollection';

export function Suppliers({ user }: { user: UserProfile }) {
  const { suppliers, loading } = useData();
  
  const { data: allPurchases } = useFetchCollection<Purchase>('purchases');

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // History modal state
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');

  const parseSafeDate = (d: any): Date | null => {
    if (!d) return null;
    try {
      const date = d.toDate ? d.toDate() : new Date(d);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  const stats = React.useMemo(() => {
    const totalSuppliers = suppliers.length;
    const now = new Date();
    const totalPurchasesAmount = allPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    
    const purchasesThisMonth = allPurchases.filter(p => {
      const date = parseSafeDate(p.date);
      if (!date) return false;
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    return { totalSuppliers, totalPurchases: totalPurchasesAmount, purchasesThisMonth };
  }, [suppliers, allPurchases]);

  const handleSave = async () => {
    if (!name) return;
    setIsSaving(true);
    const data = {
      name,
      contact,
      phone,
      category,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), data);
        toast.success('Fornecedor atualizado');
      } else {
        await addDoc(collection(db, 'suppliers'), { ...data, createdAt: serverTimestamp() });
        toast.success('Fornecedor cadastrado');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'suppliers');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setName('');
    setContact('');
    setPhone('');
    setCategory('');
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setContact(supplier.contact || '');
    setPhone(supplier.phone || '');
    setCategory(supplier.category || '');
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete || !supplierToDelete.id) return;
    try {
      await deleteDoc(doc(db, 'suppliers', supplierToDelete.id));
      toast.success('Fornecedor removido');
      setSupplierToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `suppliers/${supplierToDelete.id}`);
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-32">
      {/* Metrics Banner - Enhanced Aesthetic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-[#0f172a]/50 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Truck className="w-12 h-12 text-primary" />
          </div>
          <CardContent className="p-6">
            <p className="text-[10px] font-black tracking-[0.2em] text-primary/70 uppercase mb-2">Painel de Parceiros</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter text-white">{stats.totalSuppliers}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Ativos</span>
            </div>
            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-primary w-[70%]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a]/50 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-12 h-12 text-green-500" />
          </div>
          <CardContent className="p-6">
            <p className="text-[10px] font-black tracking-[0.2em] text-green-500/70 uppercase mb-2">Volume Mensal</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">R$ {stats.purchasesThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
              <Activity className="w-3 h-3 text-green-500" /> +12% vs mês anterior
            </div>
          </CardContent>
        </Card>

        <Card className="hidden lg:block bg-[#0f172a]/50 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <BarChart3 className="w-12 h-12 text-amber-500" />
          </div>
          <CardContent className="p-6">
            <p className="text-[10px] font-black tracking-[0.2em] text-amber-500/70 uppercase mb-2">Investimento Total</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">R$ {stats.totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase opacity-50">
               Consolidado desde o primeiro registro
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="PESQUISAR PARCEIROS..." 
            className="w-full bg-black/40 border-white/10 border h-12 rounded-xl pl-12 pr-4 text-[10px] font-bold tracking-[0.1em] uppercase focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/30"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <RegisterPurchaseModal suppliers={suppliers} />
          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger
              render={
                <Button className="flex-1 md:flex-none h-12 rounded-xl bg-primary hover:bg-primary/90 px-6 font-black uppercase text-[10px] tracking-widest gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Parceiro
                </Button>
              }
            />
            <DialogContent className="bg-[#0b1120] border-white/10 max-w-lg p-0 overflow-hidden">
               {/* Fixed padding and style for modal */}
               <div className="p-8 border-b border-white/5 bg-primary/5">
                 <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                   {editingSupplier ? 'Editar Parceiro' : 'Novo Parceiro'}
                 </DialogTitle>
                 <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Dados cadastrais de fornecimento</p>
               </div>
               <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Empresa / Razão Social</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="h-14 bg-black/40 border-white/10 focus:border-primary/50 font-bold uppercase" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contato</label>
                      <Input value={contact} onChange={(e) => setContact(e.target.value)} className="h-14 bg-black/40 border-white/10 focus:border-primary/50 font-bold uppercase" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Telefone</label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-14 bg-black/40 border-white/10 focus:border-primary/50 font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoria de Itens</label>
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} className="h-14 bg-black/40 border-white/10 focus:border-primary/50 font-bold uppercase" />
                  </div>
               </div>
               <DialogFooter className="p-8 bg-white/5 border-t border-white/5">
                 <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="uppercase font-bold text-[10px] tracking-widest">Desistir</Button>
                 <Button onClick={handleSave} disabled={isSaving} className="h-12 px-8 bg-primary hover:bg-primary/90 uppercase font-black text-[10px] tracking-widest">
                   {isSaving ? 'Gravando...' : 'Confirmar Cadastro'}
                 </Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative">
        <div className="hidden lg:block border border-white/5 rounded-3xl overflow-hidden bg-black/20 backdrop-blur-sm">
          <Table>
            <TableHeader className="bg-white/[0.03]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 pl-8">Parceiro Estratégico</TableHead>
                <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Categoria</TableHead>
                <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Última Operação</TableHead>
                <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Volume Financeiro</TableHead>
                <TableHead className="h-14 text-right pr-8 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 underline decoration-primary/30">Comandos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(supplier => {
                const supplierPurchases = allPurchases.filter(p => p.supplierId === supplier.id).sort((a,b) => {
                  const da = parseSafeDate(a.date) || new Date(0);
                  const db = parseSafeDate(b.date) || new Date(0);
                  return db.getTime() - da.getTime();
                });
                const totalSpent = supplierPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
                const lastPurchase = supplierPurchases[0];
                
                return (
                  <TableRow key={supplier.id} className="border-white/5 hover:bg-white/[0.05] transition-all group">
                    <TableCell className="py-6 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all">
                          <Truck className="w-6 h-6 text-white/40 group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight text-white mb-0.5">{supplier.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-widest">
                            <Users className="w-3 h-3 text-primary" /> {supplier.contact || 'SEM CONTATO'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1">
                        {supplier.category || 'GERAL'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lastPurchase && parseSafeDate(lastPurchase.date) ? (
                        <div className="space-y-1">
                          <p className="text-xs font-black text-white uppercase">{format(parseSafeDate(lastPurchase.date)!, 'dd MMM yyyy', { locale: ptBR })}</p>
                          <p className="text-[9px] font-bold text-primary uppercase tracking-widest leading-none">R$ {lastPurchase.totalAmount.toFixed(2)}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest italic">Sem registros</span>
                      )}
                    </TableCell>
                    <TableCell>
                       <p className="text-sm font-black text-white font-mono leading-none">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-50">{supplierPurchases.length} Pedidos Totais</p>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => { setHistorySupplier(supplier); setIsHistoryOpen(true); }} className="h-10 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary gap-2">
                           <BarChart3 className="w-4 h-4" /> Histórico
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(supplier)} className="h-10 w-10 hover:bg-white/10"><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSupplierToDelete(supplier); setIsDeleteConfirmOpen(true); }} className="h-10 w-10 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View - Enhanced Card Layout */}
        <div className="lg:hidden space-y-4">
           {filtered.map(supplier => {
              const supplierPurchases = allPurchases.filter(p => p.supplierId === supplier.id);
              const totalSpent = supplierPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
              return (
                <Card key={`mob-${supplier.id}`} className="bg-[#0f172a]/50 border-white/5 overflow-hidden active:scale-[0.98] transition-transform">
                  <div className="p-5 flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                         <Truck className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black uppercase tracking-widest text-sm text-white truncate">{supplier.name}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{supplier.category || 'GERAL'}</span>
                          <span className="text-[10px] font-black text-white font-mono">R$ {totalSpent.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                    <div className="space-y-1 border-l border-white/5 pl-3">
                       <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">Contato Principal</p>
                       <p className="text-xs font-bold text-white uppercase truncate">{supplier.contact || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 border-l border-white/5 pl-3">
                       <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">Telefone</p>
                       <p className="text-xs font-mono text-white/60 truncate">{supplier.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex border-t border-white/5 h-12 divide-x divide-white/5">
                     <button onClick={() => { setHistorySupplier(supplier); setIsHistoryOpen(true); }} className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10">
                        <BarChart3 className="w-4 h-4" /> Histórico
                     </button>
                     <button onClick={() => openEdit(supplier)} className="flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5">
                        <Edit2 className="w-4 h-4" /> Editar
                     </button>
                     <button onClick={() => { setSupplierToDelete(supplier); setIsDeleteConfirmOpen(true); }} className="px-4 flex items-center justify-center text-red-500/40 hover:bg-red-500/5">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </Card>
              )
           })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-3xl">
            <Truck className="w-16 h-16 mx-auto mb-6 text-white/5" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Nenhum parceiro técnico encontrado</p>
          </div>
        )}
      </div>

      <SupplierHistoryModal 
        supplier={historySupplier}
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Encerrar Parceria"
        description={`Deseja realmente excluir o fornecedor ${supplierToDelete?.name}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        variant="destructive"
        confirmText="Excluir"
      />
    </div>
  );
}

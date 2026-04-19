import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Supplier, UserProfile, Purchase } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Truck, Plus, Search, Phone, Tag, Edit2, Trash2, Mail, MapPin, Users, ShoppingCart, BarChart3 } from 'lucide-react';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { ConfirmDialog } from './ConfirmDialog';
import { RegisterPurchaseModal } from './RegisterPurchaseModal';
import { SupplierHistoryModal } from './SupplierHistoryModal';

import { useFetchCollection } from '../hooks/useFetchCollection';

export function Suppliers({ user }: { user: UserProfile }) {
  const supplierConstraints = React.useMemo(() => [orderBy('name', 'asc')], []);
  
  const { data: suppliers } = useFetchCollection<Supplier>('suppliers', {
    constraints: supplierConstraints
  });

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

  const stats = React.useMemo(() => {
    const totalSuppliers = suppliers.length;
    const totalPurchases = allPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const purchasesThisMonth = allPurchases.filter(p => {
      if (!p.date) return false;
      const date = p.date.toDate ? p.date.toDate() : new Date(p.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    return { totalSuppliers, totalPurchases, purchasesThisMonth };
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
    <div className="space-y-8">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Total Parceiros</p>
              <h3 className="text-2xl font-black text-white leading-none">{stats.totalSuppliers} <span className="text-[10px] text-primary">ATIVOS</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <ShoppingCart className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Volume Mensal (Compras)</p>
              <h3 className="text-2xl font-black text-white leading-none">R$ {stats.purchasesThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <BarChart3 className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Total Investido (Geral)</p>
              <h3 className="text-2xl font-black text-white leading-none">R$ {stats.totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR FORNECEDOR OU CATEGORIA..." 
            className="pl-10 md:pl-12 h-12 md:h-14 bg-card/50 border-border rounded-xl text-xs md:text-sm font-bold tracking-widest focus:ring-primary/20 focus:border-primary transition-all uppercase"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          <RegisterPurchaseModal suppliers={suppliers} />
          
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger
              nativeButton={true}
              render={
                <Button 
                  aria-label="Cadastrar Novo Fornecedor"
                  className="w-full md:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl gap-2 md:gap-3 font-black tracking-widest uppercase shadow-lg shadow-primary/20 text-[10px] md:text-sm bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  Novo Fornecedor
                </Button>
              }
            />
          <DialogContent className="bg-[#0b1120] border-border max-w-lg text-white p-0 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Truck className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">
                    {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                  </DialogTitle>
                  <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-primary/60 flex items-center gap-2">
                    <Users className="w-3 h-3" /> Gestão de Parcerias
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Nome da Empresa / Fornecedor</label>
                <Input 
                  className="h-12 bg-[#111827] border-border font-bold uppercase tracking-wider"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ambev"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Pessoa de Contato</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border font-bold uppercase"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Ex: Ricardo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Telefone</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border font-bold"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Categoria de Fornecimento</label>
                <Input 
                  className="h-12 bg-[#111827] border-border font-bold uppercase"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Bebidas, Alimentos, Limpeza"
                />
              </div>
            </div>
            <DialogFooter className="p-6 md:p-8 border-t border-border/50 bg-[#0b1120] flex-shrink-0">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="font-bold uppercase tracking-widest text-xs">Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving} className="h-12 px-8 font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 text-xs">
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </div>
                ) : (editingSupplier ? 'Salvar Alterações' : 'Salvar Fornecedor')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="border-border bg-card/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-white/[0.03]">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground h-14 pl-8">Parceiro / Fornecedor</TableHead>
                <TableHead className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground h-14">Categoria</TableHead>
                <TableHead className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground h-14">Contato & Suporte</TableHead>
                <TableHead className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground h-14">Investimento</TableHead>
                <TableHead className="text-right text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground h-14 pr-8">Ações Estratégicas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(supplier => {
                const supplierPurchases = allPurchases.filter(p => p.supplierId === supplier.id);
                const totalSpent = supplierPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
                
                return (
                  <TableRow key={supplier.id} className="border-border hover:bg-white/[0.03] transition-all group">
                    <TableCell className="py-6 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                          <Truck className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black uppercase tracking-wider text-sm">{supplier.name}</span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
                            <Plus className="w-3 h-3 text-green-500" /> Cadastrado em {supplier.createdAt?.toDate ? format(supplier.createdAt.toDate(), 'dd/MM/yyyy') : '---'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-white/5 border-border py-1 px-3 text-[9px] font-black uppercase tracking-[0.2em] text-primary/80">
                        {supplier.category || 'Geral'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" /> {supplier.contact || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                          <Phone className="w-3 h-3" /> {supplier.phone || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{supplierPurchases.length} PEDIDOS</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setHistorySupplier(supplier);
                            setIsHistoryOpen(true);
                          }}
                          className="h-10 px-4 gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Histórico
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEdit(supplier)}
                          className="h-10 w-10 hover:bg-white/5"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setSupplierToDelete(supplier);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="h-10 w-10 hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-border/50">
          {filtered.map(supplier => {
            const supplierPurchases = allPurchases.filter(p => p.supplierId === supplier.id);
            const totalSpent = supplierPurchases.reduce((acc, p) => acc + p.totalAmount, 0);

            return (
              <div key={`mobile-supplier-${supplier.id}`} className="p-6 space-y-6 bg-white/[0.01]">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black uppercase tracking-widest text-sm truncate">{supplier.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-white/5 border-border text-[8px] font-bold uppercase tracking-widest">
                          {supplier.category || 'Geral'}
                        </Badge>
                        <span className="text-[10px] font-black text-primary">R$ {totalSpent > 1000 ? `${(totalSpent/1000).toFixed(1)}k` : totalSpent.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setHistorySupplier(supplier);
                        setIsHistoryOpen(true);
                      }}
                      className="h-10 w-10 rounded-xl border-border hover:bg-primary/10 p-0"
                    >
                      <BarChart3 className="w-4 h-4 text-primary" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openEdit(supplier)}
                      className="w-10 h-10 rounded-xl hover:bg-white/5"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/30">
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">Responsável</p>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase">
                      <Users className="w-3.5 h-3.5 text-primary" /> {supplier.contact || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">Telefone</p>
                    <div className="flex items-center gap-2 text-xs font-mono font-medium">
                      <Phone className="w-3.5 h-3.5 text-primary" /> {supplier.phone || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-32 text-muted-foreground">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-white/10">
              <Truck className="w-10 h-10 opacity-20" />
            </div>
            <p className="font-black tracking-[0.3em] uppercase text-sm">Nenhum parceiro encontrado</p>
            <p className="text-[10px] uppercase tracking-widest mt-2 opacity-50">Tente ajustar sua busca ou cadastrar um novo</p>
          </div>
        )}
      </Card>

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

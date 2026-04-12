import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Supplier, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Truck, Plus, Search, Phone, Tag, Edit2, Trash2, Mail, MapPin, Users } from 'lucide-react';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { ConfirmDialog } from './ConfirmDialog';

export function Suppliers({ user }: { user: UserProfile }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });
    return () => unsubscribe();
  }, []);

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
    if (!supplierToDelete) return;
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
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR FORNECEDOR..." 
            className="pl-10 md:pl-12 h-12 md:h-14 bg-card/50 border-border rounded-xl text-xs md:text-sm font-bold tracking-widest focus:ring-primary/20 focus:border-primary transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger
            nativeButton={true}
            render={
              <Button 
                aria-label="Cadastrar Novo Fornecedor"
                className="w-full md:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl gap-2 md:gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20 text-[10px] md:text-sm"
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
                  className="h-12 bg-[#111827] border-border font-bold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ambev"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Pessoa de Contato</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Ex: Ricardo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Telefone</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Categoria de Fornecimento</label>
                <Input 
                  className="h-12 bg-[#111827] border-border"
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

      <Card className="border-border bg-card/50 rounded-2xl overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Fornecedor</TableHead>
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Categoria</TableHead>
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Contato</TableHead>
                <TableHead className="text-right text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(supplier => (
                <TableRow key={supplier.id} className="border-border hover:bg-white/5 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-bold uppercase tracking-wider">{supplier.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-white/5 border-border text-[10px] font-bold uppercase tracking-widest">
                      {supplier.category || 'Geral'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /> {supplier.contact || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {supplier.phone || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        aria-label="Editar Fornecedor"
                        title="Editar Fornecedor"
                        onClick={() => openEdit(supplier)}
                        className="hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        aria-label="Excluir Fornecedor"
                        title="Excluir Fornecedor"
                        onClick={() => {
                          setSupplierToDelete(supplier);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-border/50">
          {filtered.map(supplier => (
            <div key={`mobile-supplier-${supplier.id}`} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold uppercase tracking-wider text-sm truncate">{supplier.name}</h4>
                    <Badge variant="outline" className="bg-white/5 border-border text-[8px] font-bold uppercase tracking-widest mt-1">
                      {supplier.category || 'Geral'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openEdit(supplier)}
                    className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary"
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
                    className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                <div className="space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Contato</p>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Users className="w-3 h-3 text-primary" /> {supplier.contact || 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Telefone</p>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Phone className="w-3 h-3 text-primary" /> {supplier.phone || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24 text-muted-foreground">
            <Truck className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="font-bold tracking-widest uppercase">Nenhum fornecedor encontrado</p>
          </div>
        )}
      </Card>

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Excluir Fornecedor"
        description={`Deseja realmente excluir o fornecedor ${supplierToDelete?.name}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        variant="destructive"
        confirmText="Excluir"
      />
    </div>
  );
}

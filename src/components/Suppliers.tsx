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

export function Suppliers({ user }: { user: UserProfile }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR FORNECEDOR..." 
            className="pl-12 h-14 bg-card/50 border-border rounded-xl text-sm font-bold tracking-widest focus:ring-primary/20 focus:border-primary transition-all"
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
              <Button className="h-14 px-8 rounded-xl gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5" />
                Novo Fornecedor
              </Button>
            }
          />
          <DialogContent className="bg-[#0b1120] border-border max-w-lg text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">
                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Nome da Empresa / Fornecedor</label>
                <Input 
                  className="h-12 bg-[#111827] border-border"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ambev"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Pessoa de Contato</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Ex: Ricardo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Telefone</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Categoria de Fornecimento</label>
                <Input 
                  className="h-12 bg-[#111827] border-border"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Bebidas, Alimentos, Limpeza"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold uppercase tracking-widest">Cancelar</Button>
              <Button onClick={handleSave} className="font-bold uppercase tracking-widest bg-primary hover:bg-primary/90">Salvar Fornecedor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>

        <Card className="border-border bg-card/50 rounded-2xl overflow-hidden">
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
                      onClick={() => openEdit(supplier)}
                      className="hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={async () => {
                        if (confirm(`Excluir ${supplier.name}?`)) {
                          try {
                            await deleteDoc(doc(db, 'suppliers', supplier.id));
                            toast.success('Fornecedor excluído');
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, 'suppliers');
                          }
                        }
                      }}
                      className="hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-24 text-muted-foreground">
                  <Truck className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-bold tracking-widest uppercase">Nenhum fornecedor encontrado</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

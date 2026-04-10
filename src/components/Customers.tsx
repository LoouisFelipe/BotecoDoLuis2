import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Customer, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2 } from 'lucide-react';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

export function Customers({ user }: { user: UserProfile }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!name) return;
    const data = {
      name,
      phone,
      email,
      address,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), data);
        toast.success('Cliente atualizado');
      } else {
        await addDoc(collection(db, 'customers'), { ...data, createdAt: serverTimestamp() });
        toast.success('Cliente cadastrado');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
    }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone || '');
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setIsModalOpen(true);
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR CLIENTE..." 
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
                Novo Cliente
              </Button>
            }
          />
          <DialogContent className="bg-[#0b1120] border-border max-w-lg text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Nome Completo</label>
                <Input 
                  className="h-12 bg-[#111827] border-border"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Telefone</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">E-mail</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Endereço</label>
                <Input 
                  className="h-12 bg-[#111827] border-border"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold uppercase tracking-widest">Cancelar</Button>
              <Button onClick={handleSave} className="font-bold uppercase tracking-widest bg-primary hover:bg-primary/90">Salvar Cliente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>

        <Card className="border-border bg-card/50 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Cliente</TableHead>
              <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Contato</TableHead>
              <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Endereço</TableHead>
              <TableHead className="text-right text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(customer => (
              <TableRow key={customer.id} className="border-border hover:bg-white/5 transition-colors">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-bold uppercase tracking-wider">{customer.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {customer.phone}
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" /> {customer.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {customer.address ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {customer.address}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Não informado</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openEdit(customer)}
                      className="hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={async () => {
                        if (confirm(`Excluir ${customer.name}?`)) {
                          try {
                            await deleteDoc(doc(db, 'customers', customer.id));
                            toast.success('Cliente excluído');
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, 'customers');
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
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-bold tracking-widest uppercase">Nenhum cliente encontrado</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Customer, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, TrendingUp, TrendingDown, Star, Clock, History, Receipt, ChevronRight, X } from 'lucide-react';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Order } from '../types';

export function Customers({ user }: { user: UserProfile }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Order[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCustomerForPay, setSelectedCustomerForPay] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('DINHEIRO');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!name) return;
    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
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

  const openHistory = async (customer: Customer) => {
    setSelectedCustomerForHistory(customer);
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'open_orders'), 
        where('customerId', '==', customer.id),
        where('status', '==', 'closed'),
        orderBy('closedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setCustomerHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete || !customerToDelete.id) return;
    try {
      await deleteDoc(doc(db, 'customers', customerToDelete.id));
      toast.success('Cliente removido');
      setCustomerToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${customerToDelete.id}`);
    }
  };

  const handlePayDebt = async () => {
    if (!selectedCustomerForPay || !payAmount || parseFloat(payAmount) <= 0) return;
    setIsSaving(true);
    const amount = parseFloat(payAmount);

    try {
      // Update customer balance
      const customerRef = doc(db, 'customers', selectedCustomerForPay.id);
      await updateDoc(customerRef, {
        balance: (selectedCustomerForPay.balance || 0) + amount,
        updatedAt: serverTimestamp()
      });

      // Create transaction
      await addDoc(collection(db, 'transactions'), {
        type: 'income',
        category: 'Recebimento Fiado',
        amount: amount,
        description: `Pagamento de dívida: ${selectedCustomerForPay.name}`,
        date: serverTimestamp(),
        paymentMethod: payMethod,
        customerId: selectedCustomerForPay.id
      });

      toast.success('Pagamento registrado com sucesso');
      setIsPayModalOpen(false);
      setPayAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    } finally {
      setIsSaving(false);
    }
  };

  const openPayModal = (customer: Customer) => {
    setSelectedCustomerForPay(customer);
    setPayAmount(Math.abs(customer.balance || 0).toString());
    setPayMethod('DINHEIRO');
    setIsPayModalOpen(true);
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const totalDebt = customers.reduce((sum, c) => sum + Math.abs(Math.min(0, c.balance || 0)), 0);
  const totalCredit = customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);

  return (
    <div className="space-y-8">
      {/* Customer Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Total de Clientes</p>
              <p className="text-sm font-black uppercase tracking-tighter">{customers.length} Cadastrados</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Total em Dívida</p>
              <p className="text-sm font-black uppercase tracking-tighter text-red-500">R$ {totalDebt.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Total em Crédito</p>
              <p className="text-sm font-black uppercase tracking-tighter text-green-500">R$ {totalCredit.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Clientes VIP</p>
              <p className="text-sm font-black uppercase tracking-tighter">Top 5% Ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR CLIENTE..." 
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
              <Button className="w-full md:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl gap-2 md:gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20 text-[10px] md:text-sm">
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                Novo Cliente
              </Button>
            }
          />
          <DialogContent className="bg-[#0b1224] border-border max-w-lg text-white p-0 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Users className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1">
                    {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                  </DialogTitle>
                  <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-primary/60 flex items-center gap-2">
                    <Star className="w-3 h-3" /> Gestão de Freguesia
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Nome Completo</label>
                <Input 
                  className="h-12 bg-[#111827] border-border font-bold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Telefone / WhatsApp</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">E-mail (Opcional)</label>
                  <Input 
                    className="h-12 bg-[#111827] border-border"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Endereço / Localização</label>
                <Input 
                  className="h-12 bg-[#111827] border-border"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Rua das Flores, 123"
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
                ) : (editingCustomer ? 'Salvar Alterações' : 'Salvar Cliente')}
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
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Cliente</TableHead>
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Contato</TableHead>
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Saldo / Fiado</TableHead>
                <TableHead className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground h-14">Consumo</TableHead>
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
                    <div className="space-y-1">
                      <p className={cn(
                        "text-sm font-black",
                        (customer.balance || 0) < 0 ? "text-red-500" : (customer.balance || 0) > 0 ? "text-green-500" : "text-muted-foreground"
                      )}>
                        R$ {Math.abs(customer.balance || 0).toFixed(2)}
                        <span className="text-[8px] ml-1 uppercase opacity-60">
                          {(customer.balance || 0) < 0 ? 'Dívida' : (customer.balance || 0) > 0 ? 'Crédito' : 'Zerado'}
                        </span>
                      </p>
                      {(customer.balance || 0) < 0 && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openPayModal(customer)}
                          className="h-7 text-[8px] font-bold uppercase tracking-widest border-red-500/20 text-red-500 hover:bg-red-500/10"
                        >
                          Receber Pagamento
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-primary">R$ {(customer.totalSpent || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        {customer.orderCount || 0} Comandas
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openHistory(customer)}
                        className="hover:bg-blue-500/10 hover:text-blue-500"
                        aria-label="Ver Histórico"
                        title="Ver Histórico"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEdit(customer)}
                        className="hover:bg-primary/10 hover:text-primary"
                        aria-label="Editar Cliente"
                        title="Editar Cliente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setCustomerToDelete(customer);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="hover:bg-red-500/10 hover:text-red-500"
                        aria-label="Excluir Cliente"
                        title="Excluir Cliente"
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
          {filtered.map(customer => (
            <div key={`mobile-customer-${customer.id}`} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold uppercase tracking-wider text-sm truncate">{customer.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn(
                        "border-none text-[8px] font-bold uppercase tracking-widest",
                        (customer.balance || 0) < 0 ? "bg-red-500/10 text-red-500" : (customer.balance || 0) > 0 ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                      )}>
                        {(customer.balance || 0) < 0 ? `Dívida: R$ ${Math.abs(customer.balance || 0).toFixed(2)}` : (customer.balance || 0) > 0 ? `Crédito: R$ ${customer.balance?.toFixed(2)}` : 'Saldo Zerado'}
                      </Badge>
                      <Badge variant="outline" className="bg-white/5 border-none text-muted-foreground text-[8px] font-bold uppercase tracking-widest">
                        {customer.orderCount || 0} Comandas
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {(customer.balance || 0) < 0 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openPayModal(customer)}
                      className="w-8 h-8 rounded-lg hover:bg-green-500/10 hover:text-green-500 text-green-500"
                    >
                      <Receipt className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openHistory(customer)}
                    className="w-8 h-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openEdit(customer)}
                    className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setCustomerToDelete(customer);
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
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Total Gasto</p>
                  <p className="text-sm font-black text-primary">R$ {(customer.totalSpent || 0).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Contato</p>
                  <div className="flex flex-col gap-1">
                    {customer.phone && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Phone className="w-2.5 h-2.5 text-primary" /> {customer.phone}
                      </div>
                    )}
                    {!customer.phone && <p className="text-[10px] text-muted-foreground italic">Sem contato</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24 text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="font-bold tracking-widest uppercase">Nenhum cliente encontrado</p>
          </div>
        )}
      </Card>

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Excluir Cliente"
        description={`Deseja realmente excluir o cliente ${customerToDelete?.name}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        variant="destructive"
        confirmText="Excluir"
      />

      {/* History Modal */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="bg-[#0b1224] border-border max-w-2xl text-white p-0 overflow-hidden flex flex-col h-[95vh] md:h-[80vh]">
          <div className="p-6 md:p-8 border-b border-border/50 flex items-center justify-between bg-[#0b1224] z-10 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <History className="w-5 h-5 md:w-7 md:h-7 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg md:text-2xl font-black uppercase tracking-tighter leading-none mb-1">Histórico de Consumo</DialogTitle>
                <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-primary/60 truncate max-w-[150px] md:max-w-none">{selectedCustomerForHistory?.name}</p>
              </div>
            </div>
            <button onClick={() => setIsHistoryOpen(false)} className="text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 md:p-8 overflow-y-auto min-h-0 custom-scrollbar">
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : customerHistory.length > 0 ? (
              <div className="space-y-4 md:space-y-6">
                {customerHistory.map((order) => (
                  <div key={order.id} className="bg-[#111827]/50 border border-border/50 rounded-2xl overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-border/50 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                          <Receipt className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-black uppercase tracking-widest">
                            {order.closedAt?.toDate ? format(order.closedAt.toDate(), 'dd/MM/yyyy HH:mm') : 'Data desconhecida'}
                          </p>
                          <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                            {order.items.reduce((sum, i) => sum + i.quantity, 0)} ITENS
                          </p>
                        </div>
                      </div>
                      <p className="text-lg md:text-xl font-black text-primary tracking-tighter">R$ {order.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="p-4 md:p-6 space-y-3">
                      {order.items.map((item, iIdx) => (
                        <div key={`${order.id}-hist-${iIdx}`} className="flex justify-between items-center text-[10px] md:text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground font-bold">{item.quantity}x</span>
                            <span className="font-bold uppercase tracking-wider truncate">{item.productName}</span>
                          </div>
                          <span className="font-mono text-muted-foreground flex-shrink-0 ml-2">R$ {item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Nenhum consumo registrado</p>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 border-t border-border/50 bg-[#0b1224] flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-muted-foreground">TOTAL ACUMULADO</p>
                <p className="text-2xl md:text-3xl font-black text-primary tracking-tighter">R$ {(selectedCustomerForHistory?.totalSpent || 0).toFixed(2)}</p>
              </div>
              <Button onClick={() => setIsHistoryOpen(false)} className="h-10 md:h-12 px-6 md:px-8 font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-border rounded-xl text-[10px] md:text-sm">Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Debt Modal */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="bg-[#0b1224] border-border max-w-lg text-white p-0 overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 border-b border-border/50 relative flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <TrendingUp className="w-5 h-5 md:w-7 md:h-7 text-green-500" />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none mb-1">
                  Receber Pagamento
                </DialogTitle>
                <p className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-green-500/60 flex items-center gap-2">
                  {selectedCustomerForPay?.name} • Dívida: R$ {Math.abs(selectedCustomerForPay?.balance || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Valor do Pagamento (R$)</label>
              <Input 
                type="number"
                step="0.01"
                className="h-14 bg-[#111827] border-border text-2xl font-black text-center text-green-500"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground ml-1">Forma de Pagamento</label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="h-12 bg-[#111827] border-border font-bold text-xs uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-border">
                  {['DINHEIRO', 'PIX', 'DÉBITO', 'CRÉDITO'].map(method => (
                    <SelectItem key={method} value={method} className="font-bold uppercase tracking-widest text-xs">{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-6 md:p-8 border-t border-border/50 bg-[#0b1120] flex-shrink-0">
            <Button variant="ghost" onClick={() => setIsPayModalOpen(false)} disabled={isSaving} className="font-bold uppercase tracking-widest text-xs">Cancelar</Button>
            <Button onClick={handlePayDebt} disabled={isSaving || !payAmount || parseFloat(payAmount) <= 0} className="h-12 px-8 font-bold uppercase tracking-widest bg-green-600 hover:bg-green-700 text-xs shadow-lg shadow-green-600/20">
              {isSaving ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

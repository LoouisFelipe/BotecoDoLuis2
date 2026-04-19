import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, where } from 'firebase/firestore';
import { GameModality, GameSession, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Gamepad2, Plus, Search, Edit2, Trash2, History, TrendingUp, Trophy } from 'lucide-react';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { addDoc, updateDoc, doc, deleteDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { ConfirmDialog } from './ConfirmDialog';
import { format } from 'date-fns';

export function Games({ user }: { user: UserProfile }) {
  const [modalities, setModalities] = useState<GameModality[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameModality | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<GameModality | null>(null);

  // Modality Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [isOpenValue, setIsOpenValue] = useState(false);

  // Result Form states
  const [selectedModality, setSelectedModality] = useState<GameModality | null>(null);
  const [resultAmount, setResultAmount] = useState('');
  const [gameEntryType, setGameEntryType] = useState<'debit' | 'credit'>('debit');

  useEffect(() => {
    const unsubModalities = onSnapshot(collection(db, 'game_modalities'), (snapshot) => {
      setModalities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameModality)));
    });

    const qSessions = query(collection(db, 'game_sessions'), orderBy('date', 'desc'), limit(10));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameSession)));
    });

    return () => {
      unsubModalities();
      unsubSessions();
    };
  }, []);

  const handleSaveModality = async () => {
    if (!name || !price) return;
    const data = {
      name,
      price: parseFloat(price) || 0,
      active,
      isOpenValue,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingGame) {
        await updateDoc(doc(db, 'game_modalities', editingGame.id), data);
        toast.success('Modalidade atualizada');
      } else {
        await addDoc(collection(db, 'game_modalities'), { ...data, createdAt: serverTimestamp() });
        toast.success('Modalidade cadastrada');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'game_modalities');
    }
  };

  const handlePostResult = async () => {
    if (!selectedModality || !resultAmount) return;
    
    try {
      const sign = gameEntryType === 'credit' ? -1 : 1;
      const amount = parseFloat(resultAmount) * sign;
      await addDoc(collection(db, 'game_sessions'), {
        modalityId: selectedModality.id,
        modalityName: selectedModality.name,
        amount,
        type: gameEntryType,
        date: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || 'Staff'
      });

      // Also record as income in transactions
      await addDoc(collection(db, 'transactions'), {
        type: 'income',
        category: 'Jogos',
        amount,
        description: `Resultado: ${selectedModality.name}`,
        date: serverTimestamp()
      });

      toast.success('Resultado registrado com sucesso');
      setIsResultModalOpen(false);
      setResultAmount('');
      setSelectedModality(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'game_sessions');
    }
  };

  const resetForm = () => {
    setEditingGame(null);
    setName('');
    setPrice('');
    setActive(true);
    setIsOpenValue(false);
  };

  const openEdit = (game: GameModality) => {
    setEditingGame(game);
    setName(game.name);
    setPrice((game.price || 0).toString());
    setActive(game.active);
    setIsOpenValue(game.isOpenValue || false);
    setIsModalOpen(true);
  };

  const openPostResult = (game: GameModality) => {
    setSelectedModality(game);
    setResultAmount(game.isOpenValue ? '' : game.price.toString());
    setIsResultModalOpen(true);
  };

  const handleDelete = async () => {
    if (!gameToDelete) return;
    try {
      await deleteDoc(doc(db, 'game_modalities', gameToDelete.id));
      toast.success('Modalidade removida');
      setGameToDelete(null);
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `game_modalities/${gameToDelete.id}`);
    }
  };

  const filtered = modalities.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR MODALIDADE..." 
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
                Nova Modalidade
              </Button>
            }
          />
          <DialogContent className="bg-[#0b1120] border-border max-w-lg text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">
                {editingGame ? 'Editar Modalidade' : 'Nova Modalidade'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Nome da Modalidade</label>
                <Input 
                  className="h-12 bg-[#111827] border-border"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sinuca (Ficha)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Preço por Uso (R$)</label>
                <Input 
                  type="number"
                  step="0.01"
                  className="h-12 bg-[#111827] border-border"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  disabled={isOpenValue}
                />
                {isOpenValue && <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Valor será definido no lançamento</p>}
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isOpenValue" 
                    checked={isOpenValue} 
                    onChange={(e) => {
                      setIsOpenValue(e.target.checked);
                      if (e.target.checked) setPrice('0');
                    }}
                    className="w-4 h-4 rounded border-border bg-[#111827] text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="isOpenValue" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Valor Aberto (Variável)</label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="active" 
                    checked={active} 
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-[#111827] text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="active" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Modalidade Ativa</label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold uppercase tracking-widest text-muted-foreground hover:text-white">Cancelar</Button>
              <Button onClick={handleSaveModality} className="font-bold uppercase tracking-widest bg-primary hover:bg-primary/90">Salvar Modalidade</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

          <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
            <DialogContent className="bg-[#0b1120] border-border max-w-lg text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Lançar Resultado</DialogTitle>
                <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{selectedModality?.name}</p>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="flex bg-[#111827] p-1.5 rounded-2xl border border-border">
                  <Button 
                    variant="ghost" 
                    onClick={() => setGameEntryType('debit')}
                    className={cn(
                      "flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      gameEntryType === 'debit' ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    Entrada (Venda)
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setGameEntryType('credit')}
                    className={cn(
                      "flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      gameEntryType === 'credit' ? "bg-red-500 text-white" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    Saída (Prêmio)
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Valor do Resultado (R$)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    className="h-14 bg-[#111827] border-border text-2xl font-black text-primary"
                    value={resultAmount}
                    onChange={(e) => setResultAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsResultModalOpen(false)} className="font-bold uppercase tracking-widest text-muted-foreground hover:text-white">Cancelar</Button>
                <Button onClick={handlePostResult} className="h-12 px-8 font-bold uppercase tracking-widest bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20">Confirmar Resultado</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black uppercase tracking-tighter">Modalidades Disponíveis</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(game => (
              <Card key={game.id} className="border-border bg-card/50 rounded-2xl overflow-hidden group hover:border-primary/50 transition-all relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Gamepad2 className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        game.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {game.active ? 'Ativo' : 'Inativo'}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEdit(game)}
                          className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setGameToDelete(game);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-wider mb-1">{game.name}</h3>
                    <div className="text-2xl font-black text-primary">
                      {game.isOpenValue ? (
                        <span className="text-sm font-bold uppercase tracking-widest">Valor Aberto</span>
                      ) : (
                        <>
                          <span className="text-sm font-bold mr-1">R$</span>
                          {(game.price || 0).toFixed(2)}
                        </>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={() => openPostResult(game)}
                    className="w-full h-12 font-bold uppercase tracking-widest bg-white/5 hover:bg-primary hover:text-white border border-border group-hover:border-primary/50 transition-all"
                  >
                    Lançar Resultado
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black uppercase tracking-tighter">Últimos Lançamentos</h2>
          </div>
          <Card className="border-border bg-card/50 rounded-2xl overflow-hidden">
            <div className="divide-y divide-border">
              {sessions.map(session => (
                <div key={session.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">{session.modalityName}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {session.date?.toDate ? format(session.date.toDate(), 'HH:mm') : '...'} • {session.userName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-black",
                      session.amount >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {session.amount >= 0 ? '+' : '-'} R$ {Math.abs(session.amount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum lançamento recente</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
        {modalities.length === 0 && (
          <div className="col-span-full py-24 text-center bg-card/30 rounded-2xl border border-dashed border-border">
            <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-10" />
            <p className="text-muted-foreground font-bold tracking-widest uppercase">Nenhuma modalidade cadastrada</p>
          </div>
        )}

        <ConfirmDialog 
          isOpen={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          title="Excluir Modalidade"
          description={`Deseja realmente excluir a modalidade ${gameToDelete?.name}? Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete}
          variant="destructive"
          confirmText="Excluir"
        />
      </div>
    );
}

// Helper for cn if not imported
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

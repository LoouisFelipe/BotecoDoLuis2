import React, { useState } from 'react';
import { GameModality, UserProfile } from '../types';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Gamepad2, Plus, Search, Edit2, Trash2, History, TrendingUp, Trophy, X, Activity } from 'lucide-react';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { ConfirmDialog } from './ConfirmDialog';
import { format } from 'date-fns';
import { useGameState } from '../hooks/useGameState';

export function Games({ user }: { user: UserProfile }) {
  const {
    modalities,
    sessions,
    form,
    result
  } = useGameState(user);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<GameModality | null>(null);

  const handleSaveModality = async () => {
    const success = await form.save();
    if (success) setIsModalOpen(false);
  };

  const handlePostResult = async () => {
    const success = await result.post();
    if (success) setIsResultModalOpen(false);
  };

  const openEdit = (game: GameModality) => {
    form.startEditing(game);
    setIsModalOpen(true);
  };

  const openPostResult = (game: GameModality) => {
    result.setSelectedModality(game);
    result.setAmount(game.isOpenValue ? '' : game.price.toString());
    setIsResultModalOpen(true);
  };

  const handleDelete = async () => {
    if (!gameToDelete) return;
    const success = await form.remove(gameToDelete.id);
    if (success) {
      setGameToDelete(null);
      setIsDeleteConfirmOpen(false);
    }
  };

  const filtered = modalities.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative flex-1 w-full max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR MODALIDADE..." 
            className="pl-12 h-14 bg-[#0d1117] border-white/5 rounded-2xl text-sm font-bold tracking-widest focus:ring-primary/20 focus:border-primary transition-all uppercase"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) form.reset();
        }}>
          <DialogTrigger
            nativeButton={true}
            render={
              <Button className="h-16 px-8 rounded-2xl gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20 bg-[#0070f3] hover:bg-[#0070f3]/90 text-white">
                <Plus className="w-5 h-5" />
                Nova Modalidade
              </Button>
            }
          />
          <DialogContent className="bg-[#0b1120] border-none max-w-lg text-white shadow-2xl rounded-3xl">
            <DialogHeader className="p-6 border-b border-white/5">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                {form.editingGame ? 'Editar Modalidade' : 'Nova Modalidade'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Nome da Modalidade</label>
                <Input 
                  className="h-14 bg-[#111827] border-white/5 rounded-xl font-bold tracking-widest uppercase"
                  value={form.name}
                  onChange={(e) => form.setName(e.target.value)}
                  placeholder="Ex: Sinuca (Ficha)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Preço por Uso (R$)</label>
                <Input 
                  type="number"
                  step="0.01"
                  className="h-14 bg-[#111827] border-white/5 rounded-xl font-mono text-xl"
                  value={form.price}
                  onChange={(e) => form.setPrice(e.target.value)}
                  placeholder="0,00"
                  disabled={form.isOpenValue}
                />
                {form.isOpenValue && <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Valor será definido no lançamento</p>}
              </div>
              <div className="flex flex-col gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="isOpenValue" 
                    checked={form.isOpenValue} 
                    onChange={(e) => {
                      form.setIsOpenValue(e.target.checked);
                      if (e.target.checked) form.setPrice('0');
                    }}
                    className="w-5 h-5 rounded-lg border-white/5 bg-[#111827] text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <label htmlFor="isOpenValue" className="text-[11px] font-black uppercase tracking-widest text-white/70 cursor-pointer">Valor Aberto (Variável)</label>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="active" 
                    checked={form.isActive} 
                    onChange={(e) => form.setIsActive(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-white/5 bg-[#111827] text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <label htmlFor="active" className="text-[11px] font-black uppercase tracking-widest text-white/70 cursor-pointer">Modalidade Ativa</label>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 bg-white/5 mt-2 flex flex-row gap-2">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 font-bold uppercase tracking-widest text-muted-foreground hover:text-white">Cancelar</Button>
              <Button onClick={handleSaveModality} className="flex-1 h-12 font-bold uppercase tracking-widest bg-[#0070f3] hover:bg-[#0070f3]/90">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="bg-[#0b1120] border-none max-w-lg text-white shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-white/5 relative">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter mb-1">Lançar Resultado</DialogTitle>
              <p className="text-[10px] font-bold tracking-widest uppercase text-primary">{result.selectedModality?.name}</p>
            </DialogHeader>
            <button onClick={() => setIsResultModalOpen(false)} className="absolute right-6 top-6 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 md:p-8 space-y-8">
            <div className="flex bg-[#111827] p-1.5 rounded-2xl border border-white/5">
              <Button 
                variant="ghost" 
                onClick={() => result.setType('debit')}
                className={cn(
                  "flex-1 h-14 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  result.type === 'debit' ? "bg-green-600 text-white shadow-lg shadow-green-600/20" : "text-muted-foreground hover:text-white"
                )}
              >
                Entrada (Venda)
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => result.setType('credit')}
                className={cn(
                  "flex-1 h-14 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  result.type === 'credit' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-muted-foreground hover:text-white"
                )}
              >
                Saída (Prêmio)
              </Button>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">Valor do Resultado (R$)</label>
              <Input 
                type="number"
                step="0.01"
                className="h-20 bg-[#111827] border-white/5 rounded-2xl text-4xl font-black text-[#0070f3] font-mono text-center focus:ring-[#0070f3]/20"
                value={result.amount}
                onChange={(e) => result.setAmount(e.target.value)}
                placeholder="0,00"
                autoFocus={true}
              />
            </div>
            <Button 
              onClick={handlePostResult} 
              className={cn(
                "w-full h-16 font-bold uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-[0.98]",
                result.type === 'debit' ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
              )}
            >
              Confirmar Lançamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Banca de Jogos</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(game => (
              <Card key={game.id} className="border-white/5 bg-[#0d1117] rounded-3xl overflow-hidden group hover:border-primary/40 transition-all shadow-xl relative">
                <CardHeader className="pb-4 p-6">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <Gamepad2 className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        game.active ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {game.active ? 'Ativo' : 'Inativo'}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-wider mb-1 line-clamp-1 group-hover:text-primary transition-colors">{game.name}</h3>
                    <div className="text-3xl font-black text-primary font-mono">
                      {game.isOpenValue ? (
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-white/5 px-3 py-1 rounded-lg">Valor Variável</span>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold opacity-40">R$</span>
                          {(game.price || 0).toFixed(2).replace('.', ',')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => openPostResult(game)}
                      className="flex-[3] h-14 font-black uppercase tracking-widest bg-white/5 hover:bg-primary text-white border border-white/5 hover:border-primary/50 transition-all rounded-2xl active:scale-[0.98]"
                    >
                      Lançar
                    </Button>
                    <div className="flex-1 flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEdit(game)}
                        className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5"
                      >
                        <Edit2 className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setGameToDelete(game);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-500 border border-white/5"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {modalities.length === 0 && (
            <div className="py-32 text-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
              <Gamepad2 className="w-20 h-20 text-white/10 mx-auto mb-6" />
              <p className="text-white/30 font-black tracking-widest uppercase text-sm">Nenhuma modalidade configurada</p>
              <p className="text-white/10 text-xs font-bold uppercase mt-2">Clique em 'Nova Modalidade' para começar</p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <History className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Atividade</h2>
          </div>
          
          <Card className="border-white/5 bg-[#0d1117] rounded-[32px] overflow-hidden shadow-2xl">
            <div className="divide-y divide-white/5">
              {sessions.map(session => (
                <div key={session.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center border transition-all",
                      session.amount >= 0 ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      {session.amount >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingUp className="w-6 h-6 rotate-180" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase tracking-tight truncate group-hover:text-primary transition-colors">{session.modalityName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black text-white/30 border border-white/10 px-2 py-0.5 rounded uppercase tracking-widest">{session.userName}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                          {session.date?.toDate ? format(session.date.toDate(), 'HH:mm') : '...'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-base font-black font-mono",
                      session.amount >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {session.amount >= 0 ? '+' : '-'} R$ {Math.abs(session.amount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <div className="py-20 text-center text-white/20">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sem movimentos hoje</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Excluir Modalidade"
        description={`Deseja realmente excluir a modalidade ${gameToDelete?.name}? Esta ação não pode ser desfeita e removerá a modalidade do menu.`}
        onConfirm={handleDelete}
        variant="destructive"
        confirmText="Excluir Agora"
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

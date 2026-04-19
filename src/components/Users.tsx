import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { User, Shield, ShieldAlert, Mail, Calendar, UserCheck, UserCog, Users as UsersIcon, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useFetchCollection } from '../hooks/useFetchCollection';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { format } from 'date-fns';

export function Users({ user: currentUser }: { user: UserProfile }) {
  const { data: users, loading } = useFetchCollection<UserProfile>('users');

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'staff') => {
    if (currentUser.role !== 'admin') {
      toast.error('Apenas administradores podem alterar permissões');
      return;
    }

    if (userId === currentUser.uid) {
      toast.error('Você não pode alterar sua própria permissão');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      toast.success('Permissão atualizada com sucesso');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase mb-1">Nexus Team</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gestão de Acessos & Permissões</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/10">
            <UsersIcon className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Team Insights - Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Administradores</p>
              <h3 className="text-2xl font-black text-white leading-none">{users.filter(u => u.role === 'admin').length} <span className="text-[10px] text-primary font-black">ADM</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-border/50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <UserCog className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Equipe de Apoio</p>
              <h3 className="text-2xl font-black text-white leading-none">{users.filter(u => u.role === 'staff').length} <span className="text-[10px] text-blue-500 font-black">STAFF</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-orange-500/20 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
              <Activity className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground mb-1">Total de Colaboradores</p>
              <h3 className="text-2xl font-black text-white leading-none">{users.length} <span className="text-[10px] text-orange-500 font-black">ATIVOS</span></h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {users.map((u) => (
          <Card key={u.uid} className="bg-card/30 border-border/50 overflow-hidden rounded-[32px] group hover:border-primary/40 transition-all shadow-xl">
            <CardHeader className="p-8 pb-4 relative">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-105 transition-transform">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl font-black uppercase tracking-tight truncate leading-none mb-2">{u.displayName || u.email.split('@')[0]}</CardTitle>
                  <div className="flex items-center gap-2">
                    {u.role === 'admin' ? (
                      <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-black tracking-widest uppercase">
                        <Shield className="w-3 h-3 mr-1" />
                        Administrador
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-border text-[10px] font-black tracking-widest uppercase">
                        <UserCog className="w-3 h-3 mr-1" />
                        Equipe Staff
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold uppercase tracking-[0.1em]">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Mail className="w-4 h-4" />
                  </div>
                  {u.email}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold uppercase tracking-[0.1em]">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  Ativo desde {u.createdAt?.seconds ? format(new Date(u.createdAt.seconds * 1000), 'dd/MM/yyyy') : '---'}
                </div>
              </div>

              {currentUser.role === 'admin' && currentUser.uid !== u.uid && (
                <div className="pt-6 border-t border-white/5 flex gap-2">
                  {u.role === 'staff' ? (
                    <Button 
                      onClick={() => handleUpdateRole(u.uid, 'admin')}
                      className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 active:scale-95"
                    >
                      Promover Admin
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleUpdateRole(u.uid, 'staff')}
                      variant="outline"
                      className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest border-border hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                    >
                      Remover Admin
                    </Button>
                  )}
                </div>
              )}

              {currentUser.uid === u.uid && (
                <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center justify-center gap-2 py-3 bg-primary/5 rounded-xl border border-primary/10">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-80">Sua Sessão Ativa</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {currentUser.role !== 'admin' && (
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="text-yellow-500 w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-500">
              Apenas administradores podem alterar as permissões de acesso da equipe.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

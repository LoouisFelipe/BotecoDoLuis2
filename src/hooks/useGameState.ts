import { useState, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, limit, query, where, Timestamp } from 'firebase/firestore';
import { GameModality, GameSession, UserProfile } from '../types';
import { useFetchCollection } from './useFetchCollection';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { toast } from 'sonner';
import { startOfDay, endOfDay } from 'date-fns';

export function useGameState(user: UserProfile) {
  // --- Modalities Fetching ---
  const modalityConstraints = useMemo(() => [orderBy('name', 'asc')], []);
  const { data: modalities, loading: loadingModalities } = useFetchCollection<GameModality>('game_modalities', {
    constraints: modalityConstraints
  });

  // --- Sessions Fetching (Today's activity) ---
  const sessionConstraints = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    return [
      where('date', '>=', Timestamp.fromDate(todayStart)),
      where('date', '<=', Timestamp.fromDate(todayEnd)),
      orderBy('date', 'desc'),
      limit(50)
    ];
  }, []);
  const { data: sessions, loading: loadingSessions } = useFetchCollection<GameSession>('game_sessions', {
    constraints: sessionConstraints
  });

  // --- Form Logic (New/Edit Modality) ---
  const [editingGame, setEditingGame] = useState<GameModality | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isOpenValue, setIsOpenValue] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    setEditingGame(null);
    setName('');
    setPrice('');
    setIsOpenValue(false);
    setIsActive(true);
  }, []);

  const startEditing = useCallback((game: GameModality) => {
    setEditingGame(game);
    setName(game.name);
    setPrice(game.price.toString());
    setIsOpenValue(game.isOpenValue || false);
    setIsActive(game.active);
  }, []);

  const saveModality = async () => {
    if (!name || (!price && !isOpenValue)) {
      toast.error('Preencha os campos obrigatórios');
      return false;
    }

    setIsSaving(true);
    const data = {
      name,
      price: isOpenValue ? 0 : parseFloat(price),
      isOpenValue,
      active: isActive,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingGame) {
        await updateDoc(doc(db, 'game_modalities', editingGame.id), data);
        toast.success('Modalidade atualizada');
      } else {
        await addDoc(collection(db, 'game_modalities'), {
          ...data,
          createdAt: serverTimestamp()
        });
        toast.success('Modalidade criada');
      }
      resetForm();
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'game_modalities');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const removeModality = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'game_modalities', id));
      toast.success('Modalidade excluída');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `game_modalities/${id}`);
      return false;
    }
  };

  // --- Result Posting Logic ---
  const [selectedModality, setSelectedModality] = useState<GameModality | null>(null);
  const [resultAmount, setResultAmount] = useState('');
  const [resultType, setResultType] = useState<'debit' | 'credit'>('debit');
  const [isPosting, setIsPosting] = useState(false);

  const postResult = async () => {
    if (!selectedModality || !resultAmount) {
      toast.error('Informe o valor do resultado');
      return false;
    }

    setIsPosting(true);
    const amount = parseFloat(resultAmount);
    const finalAmount = resultType === 'debit' ? amount : -amount;

    try {
      // 1. Create Game Session
      await addDoc(collection(db, 'game_sessions'), {
        modalityId: selectedModality.id,
        modalityName: selectedModality.name,
        amount: finalAmount,
        date: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || user.email
      });

      // 2. Register Financial Transaction
      await addDoc(collection(db, 'transactions'), {
        type: resultType === 'debit' ? 'income' : 'expense',
        category: 'Banca de Jogos',
        amount: Math.abs(finalAmount),
        description: `${selectedModality.name}: ${resultType === 'debit' ? 'Entrada' : 'Saída (Prêmio)'}`,
        date: serverTimestamp(),
        paymentMethod: 'Dinheiro', // Default for games typically
        userId: user.uid
      });

      toast.success('Resultado lançado com sucesso');
      setResultAmount('');
      setSelectedModality(null);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'game_sessions');
      return false;
    } finally {
      setIsPosting(false);
    }
  };

  return {
    modalities,
    sessions,
    loading: loadingModalities || loadingSessions,
    form: {
      name,
      setName,
      price,
      setPrice,
      isOpenValue,
      setIsOpenValue,
      isActive,
      setIsActive,
      isSaving,
      editingGame,
      reset: resetForm,
      startEditing,
      save: saveModality,
      remove: removeModality
    },
    result: {
      selectedModality,
      setSelectedModality,
      amount: resultAmount,
      setAmount: setResultAmount,
      type: resultType,
      setType: setResultType,
      isPosting,
      post: postResult
    }
  };
}

import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { GameModality, GameSession, UserProfile } from '../types';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

export function useGameState(user: UserProfile) {
  const [modalities, setModalities] = useState<GameModality[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Modality Form States
  const [editingGame, setEditingGame] = useState<GameModality | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isOpenValue, setIsOpenValue] = useState(false);

  // Result/Post Session States
  const [selectedModality, setSelectedModality] = useState<GameModality | null>(null);
  const [resultAmount, setResultAmount] = useState('');
  const [gameEntryType, setGameEntryType] = useState<'debit' | 'credit'>('debit');

  useEffect(() => {
    setLoading(true);
    const unsubModalities = onSnapshot(collection(db, 'game_modalities'), (snapshot) => {
      setModalities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameModality)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'game_modalities'));

    const qSessions = query(collection(db, 'game_sessions'), orderBy('date', 'desc'), limit(10));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameSession)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'game_sessions'));

    return () => {
      unsubModalities();
      unsubSessions();
    };
  }, []);

  const resetModalityForm = () => {
    setEditingGame(null);
    setName('');
    setPrice('');
    setIsActive(true);
    setIsOpenValue(false);
  };

  const startEditing = (game: GameModality) => {
    setEditingGame(game);
    setName(game.name);
    setPrice((game.price || 0).toString());
    setIsActive(game.active);
    setIsOpenValue(game.isOpenValue || false);
  };

  const saveModality = async () => {
    if (!name || !price) {
      toast.error('Preencha os campos obrigatórios');
      return false;
    }

    const data = {
      name,
      price: parseFloat(price) || 0,
      active: isActive,
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
      resetModalityForm();
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'game_modalities');
      return false;
    }
  };

  const deleteModality = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'game_modalities', id));
      toast.success('Modalidade removida');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `game_modalities/${id}`);
      return false;
    }
  };

  const postResult = async () => {
    if (!selectedModality || !resultAmount) {
      toast.error('Preencha o valor do resultado');
      return false;
    }

    try {
      const numericAmount = parseFloat(resultAmount);
      const sign = gameEntryType === 'credit' ? -1 : 1;
      const finalAmount = numericAmount * sign;

      // 1. Record Game Session
      await addDoc(collection(db, 'game_sessions'), {
        modalityId: selectedModality.id,
        modalityName: selectedModality.name,
        amount: finalAmount,
        type: gameEntryType,
        date: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || 'Staff'
      });

      // 2. Record as income/expense in transactions
      // Note: Games are generally entries (income) even if they are 'credit' (payouts) in the context of the game session logic here
      // But logically a 'credit' is a payout (expense from the bar's perspective)
      await addDoc(collection(db, 'transactions'), {
        type: 'income', // Keeping original logic where everything is 'income' but can have negative amount? 
                        // Actually, better to define properly:
        category: 'Jogos',
        amount: finalAmount,
        description: `Resultado: ${selectedModality.name}`,
        date: serverTimestamp()
      });

      toast.success('Resultado registrado com sucesso');
      setResultAmount('');
      setSelectedModality(null);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'game_sessions');
      return false;
    }
  };

  return {
    modalities,
    sessions,
    loading,
    form: {
      editingGame,
      name,
      setName,
      price,
      setPrice,
      isActive,
      setIsActive,
      isOpenValue,
      setIsOpenValue,
      reset: resetModalityForm,
      startEditing,
      save: saveModality,
      remove: deleteModality
    },
    result: {
      selectedModality,
      setSelectedModality,
      amount: resultAmount,
      setAmount: setResultAmount,
      type: gameEntryType,
      setType: setGameEntryType,
      post: postResult
    }
  };
}

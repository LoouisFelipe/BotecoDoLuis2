import { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  QueryConstraint,
  FirestoreError,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

interface FetchCollectionOptions {
  constraints?: QueryConstraint[];
  onError?: (error: FirestoreError) => void;
  enabled?: boolean;
}

export function useFetchCollection<T = DocumentData>(
  collectionName: string,
  options: FetchCollectionOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const { enabled = true, constraints = [], onError } = options;

  // Usamos ref para o callback de erro para evitar que mudanças na função triggerem o useEffect
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Estabilizamos as constraints para evitar loops infinitos se não forem memoizadas
  // Nota: Firebase QueryConstraints não são serializáveis facilmente, então usamos o tamanho e o tipo como dica básica,
  // mas recomendamos o uso de useMemo no chamador.
  const constraintsKey = useMemo(() => {
    try {
      // Cria uma representação segura e serializável das constraints
      return JSON.stringify(
        constraints.map(c => {
          const anyC = c as any;
          return {
            type: c.type,
            field: anyC._field?.segments?.join('.') || '',
            op: anyC._op || '',
            value: anyC._value || ''
          };
        })
      );
    } catch (e) {
      return constraints.length.toString();
    }
  }, [constraints]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let isMounted = true;

    try {
      const q = query(
        collection(db, collectionName),
        ...constraints
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          const results = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          } as T));
          setData(results);
          setLoading(false);
          setError(null);
        },
        (err) => {
          if (!isMounted) return;
          console.error(`[useFetchCollection] Error in ${collectionName}:`, err);
          setError(err);
          setLoading(false);

          if (onErrorRef.current) {
            onErrorRef.current(err);
          } else {
            // Em vez de jogar o erro (crash), apenas logamos e deixamos o estado carregar o erro
            // handleFirestoreError(err, OperationType.LIST, collectionName);
          }
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err) {
      console.error(`[useFetchCollection] Query construction error:`, err);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled, constraintsKey]);

  return { data, loading, error };
}

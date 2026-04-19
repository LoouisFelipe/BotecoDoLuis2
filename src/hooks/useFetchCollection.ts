import { useState, useEffect, useRef } from 'react';
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

  // Estabilizamos as constraints usando stringify
  const constraintsKey = JSON.stringify(constraints.map(c => c.type || 'unknown'));

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const q = query(
        collection(db, collectionName), 
        ...constraints
      );

      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const results = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          } as T));
          setData(results);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`Error fetching collection ${collectionName}:`, err);
          setError(err);
          setLoading(false);
          if (onErrorRef.current) {
            onErrorRef.current(err);
          } else {
            handleFirestoreError(err, OperationType.LIST, collectionName);
          }
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error(`Query construction error for ${collectionName}:`, err);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled, constraintsKey]);

  return { data, loading, error };
}

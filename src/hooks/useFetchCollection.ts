import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  QueryConstraint, 
  FirestoreError,
  DocumentData,
  QueryDocumentSnapshot
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

  const { enabled = true } = options;
  const constraintsKey = JSON.stringify(options.constraints || []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const q = query(
        collection(db, collectionName), 
        ...(options.constraints || [])
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
          if (options.onError) {
            options.onError(err);
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
  }, [collectionName, enabled, constraintsKey, options.onError]);

  return { data, loading, error };
}

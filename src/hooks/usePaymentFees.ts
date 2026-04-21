import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { PaymentFeeConfig } from '../types';

export function usePaymentFees() {
  const [fees, setFees] = useState<PaymentFeeConfig>({ credit_pct: 0, debit_pct: 0, pix_pct: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'payment_fees', 'config_rates'), (docSnap) => {
      if (docSnap.exists()) {
        setFees(docSnap.data() as PaymentFeeConfig);
      }
    }, (error) => {
      console.error("Error fetching payment fees:", error);
    });

    return () => unsub();
  }, []);

  const calculateNet = (amount: number, method?: string) => {
    if (!method) return { amount, feeAmount: 0 };
    
    let pct = 0;
    const upperMethod = method.toUpperCase();
    if (upperMethod === 'CRÉDITO' || upperMethod === 'CREDITO') {
      pct = fees.credit_pct || 0;
    } else if (upperMethod === 'DÉBITO' || upperMethod === 'DEBITO') {
      pct = fees.debit_pct || 0;
    } else if (upperMethod === 'PIX') {
      pct = fees.pix_pct || 0;
    }

    const feeAmount = (amount * pct) / 100;
    return {
      netAmount: amount - feeAmount,
      feeAmount,
      pct
    };
  };

  return { fees, calculateNet };
}

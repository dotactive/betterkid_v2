'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';

interface PendingMoneyContextType {
  pendingAmount: number;
  setPendingAmount: (amount: number) => void;
  refreshPendingMoney: () => Promise<void>;
  addToPending: (amount: number) => void;
  removeFromPending: (amount: number) => void;
}

const PendingMoneyContext = createContext<PendingMoneyContextType | undefined>(undefined);

export function PendingMoneyProvider({ children }: { children: ReactNode }) {
  const { userId, isAuthenticated } = useAuth();
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  const refreshPendingMoney = async () => {
    if (!userId || !isAuthenticated) {
      setPendingAmount(0);
      return;
    }
    
    try {
      const response = await axios.get(`/api/pending-money?userId=${encodeURIComponent(userId)}`);
      const pendingItems = response.data || [];
      const total = pendingItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      setPendingAmount(total);
    } catch (err: any) {
      console.error('Failed to fetch pending money:', err);
      setPendingAmount(0);
    }
  };

  const addToPending = (amount: number) => {
    setPendingAmount(prev => parseFloat((prev + amount).toFixed(2)));
  };

  const removeFromPending = (amount: number) => {
    setPendingAmount(prev => parseFloat(Math.max(0, prev - amount).toFixed(2)));
  };

  useEffect(() => {
    refreshPendingMoney();
  }, [userId, isAuthenticated]);

  const value = {
    pendingAmount,
    setPendingAmount,
    refreshPendingMoney,
    addToPending,
    removeFromPending,
  };

  return (
    <PendingMoneyContext.Provider value={value}>
      {children}
    </PendingMoneyContext.Provider>
  );
}

export function usePendingMoney() {
  const context = useContext(PendingMoneyContext);
  if (context === undefined) {
    throw new Error('usePendingMoney must be used within a PendingMoneyProvider');
  }
  return context;
}
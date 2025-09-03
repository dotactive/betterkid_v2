'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { usePendingMoney } from '@/hooks/usePendingMoney';
import EntertainmentBox from '@/components/EntertainmentBox';

interface Entertainment {
  userId: string;
  partitionKey: string;
  sortKey: string;
  entertainmentId: string;
  name: string;
  image: string;
  minutesPerCoin: number;
  costPerCoin: number;
  visible: boolean;
  description: string;
}

export default function UserPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const { refreshPendingMoney } = usePendingMoney();
  const [entertainments, setEntertainments] = useState<Entertainment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (userId) {
      fetchEntertainments();
    }
  }, [userId]);

  const fetchEntertainments = async () => {
    try {
      setLoading(true);
      console.log('Fetching entertainments for userId:', userId);
      const response = await axios.get(`/api/entertainments?userId=${userId}`);
      console.log('Entertainments response:', response.data);
      setEntertainments(response.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching entertainments:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Failed to load entertainments';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (entertainmentId: string, coins: number, totalMinutes: number, totalCost: number) => {
    console.log('Purchase:', { entertainmentId, coins, totalMinutes, totalCost });
    
    try {
      // Get current user balance to check if they have enough (but don't deduct yet)
      const balanceResponse = await axios.get(`/api/user-balance?userId=${userId}`);
      const currentBalance = balanceResponse.data.balance || 0;
      
      // Check if user has enough balance for the purchase
      if (currentBalance < totalCost) {
        setError(`Insufficient balance! You have $${currentBalance.toFixed(2)} but need $${totalCost.toFixed(2)}`);
        return;
      }

      // Only add negative pending money - balance will be deducted when approved
      await axios.post('/api/pending-money', {
        userId,
        amount: -totalCost, // Negative amount for spending
        reason: `Purchased ${totalMinutes} minutes of ${entertainmentId} entertainment for ${coins} coins`,
        type: 'activity', // Using activity type as entertainment isn't in the allowed types
        referenceId: entertainmentId
      });

      // Refresh pending money context to show the new pending purchase
      await refreshPendingMoney();
      
      setError('');
      setSuccessMessage(`Successfully requested ${totalMinutes} minutes of ${entertainmentId} for $${totalCost.toFixed(2)}! Awaiting approval.`);
      console.log(`Purchase request created! $${totalCost.toFixed(2)} for ${totalMinutes} minutes of ${entertainmentId} - pending approval`);
      
      // Clear success message after 4 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
      
    } catch (err: any) {
      console.error('Purchase failed:', err);
      setError(err.response?.data?.error || 'Purchase failed. Please try again.');
      setSuccessMessage('');
    }
  };

  const handleUpdateEntertainment = async (entertainmentId: string, updates: Partial<Entertainment>) => {
    try {
      await axios.put('/api/entertainments', {
        userId,
        entertainmentId,
        updates
      });
      
      // Update local state
      setEntertainments(prev => 
        prev.map(entertainment => 
          entertainment.entertainmentId === entertainmentId 
            ? { ...entertainment, ...updates }
            : entertainment
        )
      );
      
      setError('');
    } catch (err: any) {
      setError('Failed to update entertainment: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading entertainments...</p>
      </div>
    );
  }

  return (
    <main className="">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
        {entertainments
          .filter(entertainment => editMode || entertainment.visible)
          .map((entertainment) => (
            <EntertainmentBox
              key={entertainment.sortKey}
              entertainment={entertainment}
              onPurchase={handlePurchase}
              editMode={editMode}
              onUpdate={handleUpdateEntertainment}
            />
          ))
        }
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200 col-span-full mt-8">
        <p className="text-lg font-semibold text-red-600">
          No more entertainment if coins are below -$5.00
        </p>
      </div>
    </main>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';

export default function EditCoinsPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [changes, setChanges] = useState<number>(0);
  const [inputAmount, setInputAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('Fetching balance for user:', userId);
      const fetchBalance = async () => {
        try {
          const response = await axios.get(`/api/user-balance?userId=${encodeURIComponent(userId)}`);
          console.log(`Fetched balance for ${userId}:`, response.data);
          setBalance(response.data.balance || 0);
        } catch (err: any) {
          console.error('Failed to fetch balance:', err);
          setError(err.response?.data?.error || 'Failed to fetch balance');
        }
      };
      
      fetchBalance();
    }
  }, [isAuthenticated, userId]);

  // Redirect if not in edit mode
  useEffect(() => {
    if (isAuthenticated !== null && isAuthenticated && !editMode) {
      console.log('Access denied: Edit Coins requires edit mode');
      router.push('/behaviors');
    }
  }, [isAuthenticated, editMode, router]);

  const handleButtonClick = (amount: number) => {
    setChanges((prev) => parseFloat((prev + amount).toFixed(2)));
    setInputAmount('');
    setReason('');
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputAmount(value);
    setError('');
    setSuccess('');
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  };

  const handleSubmit = async () => {
    let totalChanges = changes;

    if (inputAmount) {
      const parsedAmount = parseFloat(inputAmount);
      if (isNaN(parsedAmount)) {
        setError('Please enter a valid number (e.g., 10.00 or -15.25)');
        return;
      }
      totalChanges = parseFloat((changes + parsedAmount).toFixed(2));
    }

    // Don't submit if no changes
    if (totalChanges === 0) {
      setError('No changes to submit');
      return;
    }

    const finalBalance = parseFloat((balance + totalChanges).toFixed(2));

    try {
      console.log('Updating balance for user:', userId, 'to:', finalBalance, 'with reason:', reason);
      const response = await axios.put('/api/user-balance', {
        userId,
        balance: finalBalance,
        reason,
      });
      console.log('Balance updated:', response.data);
      setBalance(response.data.balance);
      setChanges(0);
      setInputAmount('');
      setReason('');
      setSuccess('Balance updated successfully!');
      setError('');
      
      // Refresh the page after successful submission
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to update balance:', err);
      setError(err.response?.data?.error || 'Failed to update balance');
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen main-bg flex items-center justify-center">
        <div className="text-colour-1 text-lg font-medium">🔄 Loading authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }

  if (!editMode) {
    return (
      <div className="min-h-screen main-bg flex items-center justify-center">
        <div className="text-colour-2 text-lg font-medium">🔄 Redirecting...</div>
      </div>
    );
  }

  return (
    <div>
 


        {/* Alert Messages */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600 font-medium">🚫 {error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
            <p className="text-green-600 font-medium">🎉 {success}</p>
          </div>
        )}
        
        {/* Main Card */}
        <div className="bg-white shadow-xl rounded-2xl border-2 border-colour-3 p-8">
          {/* Balance Display */}
          <div className="mb-8 text-center background-colour-3 rounded-xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-3">Balance Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 text-colour-3">
                <p className="text-sm opacity-90">Current Balance</p>
                <p className="text-3xl font-bold">${balance.toFixed(2)}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <p className="text-sm opacity-90">Pending Changes</p>
                <p className={`text-3xl font-bold ${changes >= 0 ? 'text-colour-1' : 'text-colour-2'}`}>
                  {changes >= 0 ? '+' : ''}${changes.toFixed(2)}
                </p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 text-colour-3">
                <p className="text-sm opacity-90">New Balance</p>
                <p className="text-3xl font-bold">
                  ${(balance + changes + (inputAmount ? parseFloat(inputAmount) || 0 : 0)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        
          {/* Quick Action Buttons */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-colour-2 mb-4 text-center">⚡ Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                onClick={() => handleButtonClick(1.00)}
                className="btn-1 py-3 px-4 rounded-xl font-bold text-sm transition duration-300 hover:scale-105"
              >
                🪙 +$1.00
              </button>
              <button
                onClick={() => handleButtonClick(0.50)}
                className="btn-1 py-3 px-4 rounded-xl font-bold text-sm transition duration-300 hover:scale-105"
              >
                🪙 +$0.50
              </button>
              <button
                onClick={() => handleButtonClick(0.10)}
                className="btn-1 py-3 px-4 rounded-xl font-bold text-sm transition duration-300 hover:scale-105"
              >
                🪙 +$0.10
              </button>
              <button
                onClick={() => handleButtonClick(-1.00)}
                className="btn-2 py-3 px-4 rounded-xl font-bold text-sm transition duration-300 hover:scale-105"
              >
                💸 -$1.00
              </button>
              <button
                onClick={() => handleButtonClick(-0.50)}
                className="btn-2 py-3 px-4 rounded-xl font-bold text-sm transition duration-300 hover:scale-105"
              >
                💸 -$0.50
              </button>
              <button
                onClick={() => handleButtonClick(-0.10)}
                className="btn-2 py-3 px-4 rounded-xl font-bold text-sm transition duration-300 hover:scale-105"
              >
                💸 -$0.10
              </button>
            </div>
          </div>
        
          {/* Custom Amount & Reason */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-colour-3 mb-2">Custom Amount</label>
              <input
                type="text"
                value={inputAmount}
                onChange={handleInputChange}
                placeholder="Enter amount (e.g., 10.50 or -15.25)"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-3 focus:outline-none transition duration-300"
              />
              <p className="text-xs text-gray-500 mt-1">Use positive numbers to add coins, negative to subtract</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-colour-3 mb-2">Transaction Reason</label>
              <textarea
                value={reason}
                onChange={handleReasonChange}
                placeholder="Add a reason explaining this transaction (optional)"
                rows={3}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-3 focus:outline-none transition duration-300 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">This reason will help track why coins were added or removed</p>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={changes === 0 && !inputAmount}
              className={`w-full py-4 rounded-xl text-lg font-bold transition duration-300 ${
                changes === 0 && !inputAmount
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'btn-3 hover:scale-105'
              }`}
            >
              {changes === 0 && !inputAmount ? ' No Changes to Submit' : 'Submit Changes'}
            </button>
          </div>
  
      </div>
    </div>
  );
}
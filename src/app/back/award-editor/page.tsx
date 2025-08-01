'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

export default function AwardEditorPage() {
  const { isAuthenticated, userId } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [inputAmount, setInputAmount] = useState('');
  const [note, setNote] = useState('');
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

  const handleButtonClick = (amount: number) => {
    setBalance((prev) => parseFloat((prev + amount).toFixed(2)));
    setInputAmount('');
    setNote('');
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputAmount(value);
    setError('');
    setSuccess('');
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
  };

  const handleSubmit = async () => {
    let finalBalance = balance;

    if (inputAmount) {
      const parsedAmount = parseFloat(inputAmount);
      if (isNaN(parsedAmount)) {
        setError('Please enter a valid number (e.g., 10.00 or -15.25)');
        return;
      }
      finalBalance = parseFloat((balance + parsedAmount).toFixed(2));
    }

    try {
      console.log('Updating balance for user:', userId, 'to:', finalBalance, 'with note:', note);
      const response = await axios.put('/api/user-balance', {
        userId,
        balance: finalBalance,
        note,
      });
      console.log('Balance updated:', response.data);
      setBalance(response.data.balance);
      setInputAmount('');
      setNote('');
      setSuccess('Balance updated successfully!');
      setError('');
    } catch (err: any) {
      console.error('Failed to update balance:', err);
      setError(err.response?.data?.error || 'Failed to update balance');
    }
  };

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Award Editor for {userId}</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {success && <p className="text-green-600 mb-4">{success}</p>}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Current Balance: ${balance.toFixed(2)}
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <button
            onClick={() => handleButtonClick(1.00)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
          >
            +$1.00
          </button>
          <button
            onClick={() => handleButtonClick(0.10)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
          >
            +$0.10
          </button>
          <button
            onClick={() => handleButtonClick(-1.00)}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
          >
            -$1.00
          </button>
          <button
            onClick={() => handleButtonClick(-0.10)}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
          >
            -$0.10
          </button>
        </div>
        <div className="flex flex-col gap-4 mb-4">
          <input
            type="text"
            value={inputAmount}
            onChange={handleInputChange}
            placeholder="Enter amount (e.g., -15.25)"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={note}
            onChange={handleNoteChange}
            placeholder="Add a note to this transaction (optional)"
            rows={3}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

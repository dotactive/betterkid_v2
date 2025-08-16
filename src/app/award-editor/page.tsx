'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { usePendingMoney } from '@/hooks/usePendingMoney';

interface PendingMoney {
  pendingId: string;
  userId: string;
  amount: number;
  reason: string;
  type: 'todo' | 'activity' | 'behavior';
  referenceId: string;
  createdAt: string;
}

export default function AwardEditorPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const { refreshPendingMoney } = usePendingMoney();
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [changes, setChanges] = useState<number>(0);
  const [inputAmount, setInputAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingMoney, setPendingMoney] = useState<PendingMoney[]>([]);

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
      
      const fetchPendingMoney = async () => {
        try {
          const response = await axios.get(`/api/pending-money?userId=${encodeURIComponent(userId)}`);
          console.log(`Fetched pending money for ${userId}:`, response.data);
          setPendingMoney(response.data || []);
        } catch (err: any) {
          console.error('Failed to fetch pending money:', err);
        }
      };
      
      fetchBalance();
      fetchPendingMoney();
    }
  }, [isAuthenticated, userId]);

  // Redirect if not in edit mode
  useEffect(() => {
    if (isAuthenticated !== null && isAuthenticated && !editMode) {
      console.log('Access denied: Award Editor requires edit mode');
      router.push('/behaviors');
    }
  }, [isAuthenticated, editMode, router]);

  const handleButtonClick = (amount: number) => {
    setChanges((prev) => parseFloat((prev + amount).toFixed(2)));
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

  const handleApprovePending = async (pendingId: string) => {
    try {
      console.log('Approving pending money:', pendingId);
      const response = await axios.post(`/api/pending-money/${pendingId}`, {
        userId,
      });
      console.log('Pending money approved:', response.data);
      setSuccess(`Approved: ${response.data.message}`);
      setError('');
      
      // Refresh data
      const balanceResponse = await axios.get(`/api/user-balance?userId=${encodeURIComponent(userId)}`);
      setBalance(balanceResponse.data.balance || 0);
      
      const pendingResponse = await axios.get(`/api/pending-money?userId=${encodeURIComponent(userId)}`);
      setPendingMoney(pendingResponse.data || []);
      
      // Refresh the global pending money context
      refreshPendingMoney();
    } catch (err: any) {
      console.error('Failed to approve pending money:', err);
      setError(err.response?.data?.error || 'Failed to approve pending money');
    }
  };

  const handleApproveAll = async () => {
    if (pendingMoney.length === 0) return;
    
    try {
      console.log('Approving all pending money');
      // Use the first pending ID as a placeholder since we're approving all
      const response = await axios.post(`/api/pending-money/${pendingMoney[0].pendingId}`, {
        userId,
        approveAll: true,
      });
      console.log('All pending money approved:', response.data);
      setSuccess(`Approved all: ${response.data.message}`);
      setError('');
      
      // Refresh data
      const balanceResponse = await axios.get(`/api/user-balance?userId=${encodeURIComponent(userId)}`);
      setBalance(balanceResponse.data.balance || 0);
      
      setPendingMoney([]);
      
      // Refresh the global pending money context
      refreshPendingMoney();
    } catch (err: any) {
      console.error('Failed to approve all pending money:', err);
      setError(err.response?.data?.error || 'Failed to approve all pending money');
    }
  };

  const handleDeletePending = async (pendingId: string) => {
    try {
      console.log('Deleting pending money:', pendingId);
      await axios.delete(`/api/pending-money/${pendingId}`, {
        headers: { 'x-userid': userId }
      });
      console.log('Pending money deleted');
      setSuccess('Pending money deleted successfully');
      setError('');
      
      // Refresh pending money
      const pendingResponse = await axios.get(`/api/pending-money?userId=${encodeURIComponent(userId)}`);
      setPendingMoney(pendingResponse.data || []);
      
      // Refresh the global pending money context
      refreshPendingMoney();
    } catch (err: any) {
      console.error('Failed to delete pending money:', err);
      setError(err.response?.data?.error || 'Failed to delete pending money');
    }
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
      console.log('Updating balance for user:', userId, 'to:', finalBalance, 'with note:', note);
      const response = await axios.put('/api/user-balance', {
        userId,
        balance: finalBalance,
        note,
      });
      console.log('Balance updated:', response.data);
      setBalance(response.data.balance);
      setChanges(0);
      setInputAmount('');
      setNote('');
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
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }

  if (!editMode) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Redirecting...</div>;
  }

  const totalPendingAmount = pendingMoney.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className=" py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Award Editor for {userId}</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {success && <p className="text-green-600 mb-4">{success}</p>}
      
      {/* Pending Money Section */}
      {pendingMoney.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-800">
              🏆 Pending Rewards (${totalPendingAmount.toFixed(2)})
            </h2>
            <button
              onClick={handleApproveAll}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Approve All
            </button>
          </div>
          <div className="space-y-3">
            {pendingMoney.map((item) => (
              <div key={item.pendingId} className="bg-white p-4 rounded-md border border-yellow-200">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.reason}</p>
                    <p className="text-sm text-gray-600">
                      ${item.amount.toFixed(2)} • {item.type} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprovePending(item.pendingId)}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeletePending(item.pendingId)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">

          <h2 className="text-lg font-medium text-blue-600">
            Changes: ${changes.toFixed(2)}
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <button
            onClick={() => handleButtonClick(1.00)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
          >
            +$1.00
          </button>
          <button
            onClick={() => handleButtonClick(0.50)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
          >
            +$0.50
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
            onClick={() => handleButtonClick(-0.50)}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
          >
            -$0.50
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
            disabled={changes === 0 && !inputAmount}
            className={`px-6 py-2 rounded-md transition-colors ${
              changes === 0 && !inputAmount
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

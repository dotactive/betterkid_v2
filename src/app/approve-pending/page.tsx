'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { usePendingMoney } from '@/hooks/usePendingMoney';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

interface PendingMoney {
  pendingId: string;
  userId: string;
  amount: number;
  reason: string;
  type: 'todo' | 'activity' | 'behavior';
  referenceId: string;
  createdAt: string;
}

export default function ApprovePendingPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const { refreshPendingMoney } = usePendingMoney();
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingMoney, setPendingMoney] = useState<PendingMoney[]>([]);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('Fetching pending money for user:', userId);
      const fetchPendingMoney = async () => {
        try {
          const response = await axios.get(`/api/pending-money?userId=${encodeURIComponent(userId)}`);
          console.log(`Fetched pending money for ${userId}:`, response.data);
          setPendingMoney(response.data || []);
        } catch (err: any) {
          console.error('Failed to fetch pending money:', err);
          setError(err.response?.data?.error || 'Failed to fetch pending money');
        }
      };
      
      const fetchBalance = async () => {
        try {
          const response = await axios.get(`/api/user-balance?userId=${encodeURIComponent(userId)}`);
          console.log(`Fetched balance for ${userId}:`, response.data);
          setBalance(response.data.balance || 0);
        } catch (err: any) {
          console.error('Failed to fetch balance:', err);
        }
      };
      
      fetchPendingMoney();
      fetchBalance();
    }
  }, [isAuthenticated, userId]);

  // No redirect based on edit mode - allow viewing in any mode

  const handleApprovePending = async (pendingId: string) => {
    if (!userId) return;
    
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
    if (pendingMoney.length === 0 || !userId) return;
    
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
    if (!userId) return;

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

  const handleDenyAll = async () => {
    if (pendingMoney.length === 0 || !userId) return;

    try {
      console.log('Denying all pending money');
      // Delete all pending items
      await Promise.all(
        pendingMoney.map(item =>
          axios.delete(`/api/pending-money/${item.pendingId}`, {
            headers: { 'x-userid': userId }
          })
        )
      );
      console.log('All pending money denied');
      setSuccess('All pending rewards have been denied');
      setError('');

      setPendingMoney([]);

      // Refresh the global pending money context
      refreshPendingMoney();
    } catch (err: any) {
      console.error('Failed to deny all pending money:', err);
      setError(err.response?.data?.error || 'Failed to deny all pending money');
    }
  };

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }

  // Allow viewing in any mode

  const totalPendingAmount = pendingMoney.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Approve Pending Rewards for {userId}</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {success && <p className="text-green-600 mb-4">{success}</p>}
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 font-medium">Current Balance: ${balance.toFixed(2)}</p>
        {totalPendingAmount > 0 && (
          <p className="text-blue-700">
            After approving all pending: ${(balance + totalPendingAmount).toFixed(2)}
          </p>
        )}
      </div>
      
      {/* Pending Money Section */}
      {pendingMoney.length > 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-800">
              🏆 Pending Rewards (${totalPendingAmount.toFixed(2)})
            </h2>
            <div className="flex gap-2">
              {editMode && (
                <button
                  onClick={handleApproveAll}
                  className="btn-1 px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Approve All
                </button>
              )}
              <button
                onClick={handleDenyAll}
                className="btn-2 px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Deny All
              </button>
            </div>
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
                    {editMode && (
                      <button
                        onClick={() => handleApprovePending(item.pendingId)}
                        className="btn-1 px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                      >
                        <FontAwesomeIcon icon={faCheck} className="text-xs" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePending(item.pendingId)}
                      className="btn-2 px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-lg font-medium text-gray-600 mb-2">No Pending Rewards</h2>
          <p className="text-gray-500">There are currently no pending rewards to approve.</p>
        </div>
      )}
    </div>
  );
}
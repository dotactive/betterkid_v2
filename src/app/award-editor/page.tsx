'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { usePendingMoney } from '@/hooks/usePendingMoney';

export default function AwardEditorPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const { pendingAmount } = usePendingMoney();
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);

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
        }
      };
      
      fetchBalance();
    }
  }, [isAuthenticated, userId]);

  // Redirect if not in edit mode
  useEffect(() => {
    if (isAuthenticated !== null && isAuthenticated && !editMode) {
      console.log('Access denied: Award Editor requires edit mode');
      router.push('/behaviors');
    }
  }, [isAuthenticated, editMode, router]);

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }

  if (!editMode) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Redirecting...</div>;
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Award Editor for {userId}</h1>
      
      {/* Overview Card */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">Current Balance</h3>
            <p className="text-2xl font-bold text-blue-600">${balance.toFixed(2)}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-900">Pending Rewards</h3>
            <p className="text-2xl font-bold text-yellow-600">${pendingAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Approve Pending Card */}
        <Link href="/approve-pending" className="block group">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 hover:border-yellow-400 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-yellow-800">🏆 Approve Pending</h2>
              <span className="text-yellow-600 group-hover:text-yellow-800 transition-colors">→</span>
            </div>
            <p className="text-yellow-700 mb-4">
              Review and approve pending rewards from completed activities and behaviors.
            </p>
            {pendingAmount > 0 ? (
              <div className="bg-yellow-100 border border-yellow-300 rounded-md p-3">
                <p className="text-sm font-medium text-yellow-800">
                  ${pendingAmount.toFixed(2)} waiting for approval
                </p>
              </div>
            ) : (
              <div className="bg-gray-100 border border-gray-300 rounded-md p-3">
                <p className="text-sm text-gray-600">No pending rewards</p>
              </div>
            )}
          </div>
        </Link>

        {/* Edit Coins Card */}
        <Link href="/edit-coins" className="block group">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 hover:border-blue-400 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-blue-800">💰 Edit Coins</h2>
              <span className="text-blue-600 group-hover:text-blue-800 transition-colors">→</span>
            </div>
            <p className="text-blue-700 mb-4">
              Manually adjust coin balance for bonuses, penalties, or corrections.
            </p>
            <div className="bg-blue-100 border border-blue-300 rounded-md p-3">
              <p className="text-sm font-medium text-blue-800">
                Current balance: ${balance.toFixed(2)}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Instructions</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use <strong>Approve Pending</strong> to review and approve rewards earned from activities</li>
          <li>• Use <strong>Edit Coins</strong> to manually adjust the coin balance for special situations</li>
          <li>• All changes are logged and can be viewed in the Logs section</li>
        </ul>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';

interface BalanceLog {
  logId: string;
  balanceBefore?: number;
  balanceAfter?: number;
  amount?: number;
  reason?: string;
  note?: string;
  type?: string;
  source?: string;
  timestamp: string;
}

export default function LogsPage() {
  const { isAuthenticated, userId } = useAuth();
  const [logs, setLogs] = useState<BalanceLog[]>([]);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { editMode } = useEditMode();
  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchLogs();
    }
  }, [isAuthenticated, userId]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`/api/logs?userId=${encodeURIComponent(userId!)}`);
      setLogs(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
      setError(err.response?.data?.error || 'Failed to fetch logs');
    }
  };

  const handleEmptyAllLogs = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete ALL log entries?\n\n' +
      'This will permanently remove:\n' +
      `• All ${logs.length} activity logs\n` +
      '• Balance change history\n' +
      '• Transaction records\n\n' +
      'This action cannot be undone!'
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await axios.delete(`/api/logs?userId=${encodeURIComponent(userId!)}`);
      console.log('Delete response:', response.data);
      
      // Refresh the logs list (should be empty now)
      await fetchLogs();
      
      alert(`Successfully deleted ${response.data.deletedCount} log entries!`);
    } catch (err: any) {
      console.error('Failed to delete logs:', err);
      setError(err.response?.data?.error || 'Failed to delete logs');
      alert('Failed to delete logs. Please try again.');
    } finally {
      setIsDeleting(false);
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
    return null;
  }

  return (
    <div className="min-h-screen main-bg py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-colour-3 mb-2">📋 Activity Logs</h1>
          <p className="text-gray-600 text-lg">Track all your coin transactions and balance changes</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-colour-1 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-colour-1">
                <span className="text-sm font-medium">Total Entries:</span>
                <span className="ml-2 font-bold text-lg">{logs.length}</span>
              </div>
            </div>
            
            {logs.length > 0 && editMode && (
              <button
                onClick={handleEmptyAllLogs}
                disabled={isDeleting}
                className={`transition duration-300 ${
                  isDeleting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed py-3 px-6 rounded-xl'
                    : 'btn-2 py-3 px-6 rounded-xl font-semibold hover:scale-105'
                }`}
              >
                {isDeleting ? '🗑️ Deleting...' : '🗑️ Empty All Logs'}
              </button>
            )}
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600 font-medium">🚫 {error}</p>
          </div>
        )}
        {/* Logs Table */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-colour-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="background-colour-3">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">📅 Date & Time</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">🏷️ Type</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">💰 Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">📊 Before</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">📈 After</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">📝 Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="text-6xl mb-4">📋</div>
                      <h3 className="text-xl font-bold text-colour-2 mb-2">No activity logs yet!</h3>
                      <p className="text-gray-500">Complete some todos or activities to see your progress here.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <tr key={log.logId} className={`hover:bg-gray-50 transition duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-medium">{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          // Determine type from balance change or amount field
                          let balanceChange = 0;
                          let isPositive = true;
                          
                          if (log.balanceAfter != null && log.balanceBefore != null) {
                            // Use balance change if available
                            balanceChange = log.balanceAfter - log.balanceBefore;
                            isPositive = balanceChange >= 0;
                          } else if (log.amount != null) {
                            // Fall back to amount field
                            balanceChange = log.amount;
                            isPositive = log.amount >= 0;
                          } else {
                            // Use type field if available
                            isPositive = log.type !== 'lose';
                          }
                          
                          const type = isPositive ? 'EARN' : 'LOSE';
                          
                          return (
                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                              isPositive ? 'background-colour-1 text-white' : 'background-colour-2 text-white'
                            }`}>
                              {isPositive ? '🪙' : '💸'} {type}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        {(() => {
                          // Calculate amount from balance change or use amount field
                          let amount = 0;
                          let isPositive = true;
                          
                          if (log.balanceAfter != null && log.balanceBefore != null) {
                            // Use balance change if available
                            const balanceChange = log.balanceAfter - log.balanceBefore;
                            amount = Math.abs(balanceChange);
                            isPositive = balanceChange >= 0;
                          } else if (log.amount != null) {
                            // Fall back to amount field
                            amount = Math.abs(log.amount);
                            isPositive = log.amount >= 0;
                          }
                          
                          return (
                            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                              {isPositive ? '+' : '-'}${amount.toFixed(2)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="font-mono">
                          ${log.balanceBefore != null ? log.balanceBefore.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="font-mono font-bold text-colour-1">
                          ${log.balanceAfter != null ? log.balanceAfter.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="max-w-xs truncate" title={log.reason || log.note || '-'}>
                          {log.reason || log.note || '-'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

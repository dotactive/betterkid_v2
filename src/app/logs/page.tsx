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
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white shadow-md rounded-md overflow-x-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          
          {logs.length > 0 && editMode  && (
            <button
              onClick={handleEmptyAllLogs}
              disabled={isDeleting}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isDeleting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white hover:shadow-md'
              }`}
            >
              {isDeleting ? ' Deleting...' : 'Empty All Logs'}
            </button>
          )}
        </div>
        

      </div>
  
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No activity logs yet!</p>
                  <p className="text-sm">Complete some todos or activities to see your progress here.</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.logId}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {(() => {
                      // Determine type from balance change
                      const balanceChange = (log.balanceAfter ?? 0) - (log.balanceBefore ?? 0);
                      const isPositive = balanceChange >= 0;
                      const type = isPositive ? 'earn' : 'lose';
                      
                      return (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {type}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {(() => {
                      // Calculate amount from balance change
                      const balanceChange = (log.balanceAfter ?? 0) - (log.balanceBefore ?? 0);
                      const amount = Math.abs(balanceChange);
                      const isPositive = balanceChange >= 0;
                      
                      return (
                        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                          {isPositive ? '+' : '-'}${amount.toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {log.reason || log.note || '-'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {log.source || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

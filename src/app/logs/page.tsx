'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

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

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white shadow-md rounded-md overflow-x-auto">
  
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
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      log.type === 'earn' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.type || 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    <span className={log.type === 'earn' ? 'text-green-600' : 'text-red-600'}>
                      {log.type === 'earn' ? '+' : '-'}${(log.amount || 0).toFixed(2)}
                    </span>
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

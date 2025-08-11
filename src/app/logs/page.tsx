'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

interface BalanceLog {
  logId: string;
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="bg-white shadow-md rounded-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Before</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">After</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.logId}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${log.balanceBefore.toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${log.balanceAfter.toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{log.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

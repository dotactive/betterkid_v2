'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

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

export default function EntertainmentEditor() {
  const { userId } = useAuth();
  const [entertainments, setEntertainments] = useState<Entertainment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) {
      fetchEntertainments();
    }
  }, [userId]);

  const fetchEntertainments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/entertainments?userId=${userId}`);
      setEntertainments(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load entertainments');
    } finally {
      setLoading(false);
    }
  };

  const updateEntertainment = async (entertainment: Entertainment) => {
    try {
      setSaving(entertainment.sortKey);
      
      await axios.put('/api/entertainments', {
        userId: entertainment.userId,
        entertainmentId: entertainment.entertainmentId,
        updates: {
          name: entertainment.name,
          minutesPerCoin: entertainment.minutesPerCoin,
          costPerCoin: entertainment.costPerCoin,
          visible: entertainment.visible,
          description: entertainment.description
        }
      });
      
      setError('');
    } catch (err) {
      setError('Failed to update entertainment');
    } finally {
      setSaving('');
    }
  };

  const handleFieldChange = (index: number, field: keyof Entertainment, value: any) => {
    const updated = [...entertainments];
    updated[index] = { ...updated[index], [field]: value };
    setEntertainments(updated);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Entertainment Editor</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {entertainments.map((entertainment, index) => (
          <div key={entertainment.sortKey} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={entertainment.name}
                  onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Minutes per Coin</label>
                <input
                  type="number"
                  value={entertainment.minutesPerCoin}
                  onChange={(e) => handleFieldChange(index, 'minutesPerCoin', parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cost per Coin ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={entertainment.costPerCoin}
                  onChange={(e) => handleFieldChange(index, 'costPerCoin', parseFloat(e.target.value) || 0)}
                  min="0"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={entertainment.visible}
                    onChange={(e) => handleFieldChange(index, 'visible', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Visible</span>
                </label>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={entertainment.description}
                onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                rows={2}
                className="w-full p-2 border rounded"
                placeholder="Each coin adds X minutes of Y time."
              />
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img 
                  src={entertainment.image} 
                  alt={entertainment.name}
                  className="w-16 h-16 rounded border object-cover"
                />
                <div className="text-sm text-gray-600">
                  ID: {entertainment.entertainmentId}
                </div>
              </div>
              
              <button
                onClick={() => updateEntertainment(entertainment)}
                disabled={saving === entertainment.sortKey}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {saving === entertainment.sortKey ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
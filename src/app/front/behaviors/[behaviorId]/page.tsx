'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';

interface Activity {
  activityId: string;
  activityName: string;
  money: number;
  positive: boolean;
}

interface Behavior {
  behaviorId: string;
  behaviorName: string;
  bannerImage?: string | null;
  thumbImage?: string | null;
}

export default function BehaviorDetailPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const { behaviorId } = useParams() as { behaviorId: string };
  const [behavior, setBehavior] = useState<Behavior | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    money: 0,
    positive: true
  });
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState({
    name: '',
    money: 0,
    positive: true
  });

  useEffect(() => {
    if (isAuthenticated && userId && behaviorId) {
      console.log(`Fetching data for behavior: ${behaviorId}`);
      fetchBehavior();
      fetchActivities();
    }
  }, [isAuthenticated, userId, behaviorId]);

  useEffect(() => {
    if (!editMode) {
      setShowAddActivity(false);
      setEditingActivityId(null);
    }
  }, [editMode]);

  const fetchBehavior = async () => {
    try {
      const response = await axios.get(`/api/behaviors?userId=${encodeURIComponent(userId ?? '')}`);
      const behaviors: Behavior[] = response.data || [];
      const target = behaviors.find((b) => b.behaviorId === behaviorId);
      if (!target) throw new Error('Behavior not found');
      setBehavior(target);
    } catch (err: any) {
      console.error('Failed to fetch behavior:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch behavior');
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`/api/activities?behaviorId=${encodeURIComponent(behaviorId)}`);
      setActivities(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch activities:', err);
      setError(err.response?.data?.error || 'Failed to fetch activities');
    }
  };


  const handleAddActivity = async () => {
    if (!newActivity.name.trim()) {
      setError('Activity name is required');
      return;
    }
    
    try {
      await axios.post('/api/activities', {
        behaviorId,
        activityName: newActivity.name.trim(),
        money: newActivity.money,
        positive: newActivity.positive,
      });
      setNewActivity({ name: '', money: 0, positive: true });
      setShowAddActivity(false);
      fetchActivities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add activity');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/activities/${activityId}`);
      fetchActivities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete activity');
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivityId(activity.activityId);
    setEditingActivity({
      name: activity.activityName,
      money: activity.money,
      positive: activity.positive
    });
  };

  const handleSaveActivity = async (activityId: string) => {
    if (!editingActivity.name.trim()) {
      setError('Activity name is required');
      return;
    }
    
    try {
      await axios.put(`/api/activities/${activityId}`, {
        activityName: editingActivity.name.trim(),
        money: editingActivity.money,
        positive: editingActivity.positive,
      });
      setEditingActivityId(null);
      setEditingActivity({ name: '', money: 0, positive: true });
      fetchActivities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update activity');
    }
  };

  const handleCancelEditActivity = () => {
    setEditingActivityId(null);
    setEditingActivity({ name: '', money: 0, positive: true });
  };

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  if (!behavior) {
    return <div className="p-6 text-gray-600">Loading behavior details...</div>;
  }

  // Separate activities
  const positiveActivities = activities.filter((a) => a.positive);
  const negativeActivities = activities.filter((a) => !a.positive);

  return (
    <div>
      {editMode && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowAddActivity(!showAddActivity)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium"
          >
            {showAddActivity ? 'Cancel' : 'Add Activity'}
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-8 text-center">{behavior.behaviorName}</h1>

      {/* Add Activity Form */}
      {editMode && showAddActivity && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-medium mb-3">Add New Activity</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newActivity.name}
              onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
              placeholder="Activity name"
              className="w-full p-2 border rounded"
            />
            <div className="flex gap-3">
              <input
                type="number"
                step="0.01"
                value={newActivity.money}
                onChange={(e) => setNewActivity({ ...newActivity, money: parseFloat(e.target.value) || 0 })}
                placeholder="Money amount"
                className="flex-1 p-2 border rounded"
              />
              <select
                value={newActivity.positive ? '+' : '-'}
                onChange={(e) => setNewActivity({ ...newActivity, positive: e.target.value === '+' })}
                className="p-2 border rounded"
              >
                <option value="+">+</option>
                <option value="-">-</option>
              </select>
            </div>
            <button
              onClick={handleAddActivity}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Add Activity
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 mb-4 text-center">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-black">
        {/* Positive Activities */}
        <section className="bg-green-50 rounded-2xl shadow p-6 border border-green-200 min-h-[300px] flex flex-col">
          <h2 className="text-xl font-semibold text-green-700 mb-4 text-center">Positive Activities</h2>
          {positiveActivities.length === 0 ? (
            <p className="text-gray-500 text-center">No positive activities found.</p>
          ) : (
            <ul className="flex-1 pl-6">
              {positiveActivities.map((activity) => (
                <li key={activity.activityId} className="mb-3">
                  {editMode && editingActivityId === activity.activityId ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingActivity.name}
                        onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                        className="w-full p-2 border rounded text-gray-900"
                        placeholder="Activity name"
                      />
                      <div className="flex gap-2">
                        <select
                          value={editingActivity.positive ? '+' : '-'}
                          onChange={(e) => setEditingActivity({ ...editingActivity, positive: e.target.value === '+' })}
                          className="p-2 border rounded text-gray-900"
                        >
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={editingActivity.money}
                          onChange={(e) => setEditingActivity({ ...editingActivity, money: parseFloat(e.target.value) || 0 })}
                          className="flex-1 p-2 border rounded text-gray-900"
                          placeholder="Amount"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveActivity(activity.activityId)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEditActivity}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`${editMode ? 'flex justify-between items-center' : ''}`}>
                      <div>
                        <span className="font-medium">{activity.activityName}</span> — ${activity.money.toFixed(2)}
                      </div>
                      {editMode && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditActivity(activity)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(activity.activityId)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        
        {/* Negative Activities */}
        <section className="bg-red-50 rounded-2xl shadow p-6 border border-red-200 min-h-[300px] flex flex-col">
          <h2 className="text-xl font-semibold text-red-700 mb-4 text-center">Negative Activities</h2>
          {negativeActivities.length === 0 ? (
            <p className="text-gray-500 text-center">No negative activities found.</p>
          ) : (
            <ul className="flex-1 pl-6">
              {negativeActivities.map((activity) => (
                <li key={activity.activityId} className="mb-3">
                  {editMode && editingActivityId === activity.activityId ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingActivity.name}
                        onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                        className="w-full p-2 border rounded text-gray-900"
                        placeholder="Activity name"
                      />
                      <div className="flex gap-2">
                        <select
                          value={editingActivity.positive ? '+' : '-'}
                          onChange={(e) => setEditingActivity({ ...editingActivity, positive: e.target.value === '+' })}
                          className="p-2 border rounded text-gray-900"
                        >
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={editingActivity.money}
                          onChange={(e) => setEditingActivity({ ...editingActivity, money: parseFloat(e.target.value) || 0 })}
                          className="flex-1 p-2 border rounded text-gray-900"
                          placeholder="Amount"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveActivity(activity.activityId)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEditActivity}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`${editMode ? 'flex justify-between items-center' : ''}`}>
                      <div>
                        <span className="font-medium">{activity.activityName}</span> — ${activity.money.toFixed(2)}
                      </div>
                      {editMode && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditActivity(activity)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(activity.activityId)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </div>
  );
}

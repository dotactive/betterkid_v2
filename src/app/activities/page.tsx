'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faMinus, 
  faCoins,
  faFilter,
  faSearch,
  faSort,
  faThumbtack,
  faEdit,
  faTrash,
  faCheck,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

interface Activity {
  activityId: string;
  activityName: string;
  money: number;
  positive: boolean;
  top?: boolean;
  behaviorId?: string;
  behaviorName?: string;
  completed?: 'false' | 'pending' | 'true';
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'once';
}

interface Behavior {
  behaviorId: string;
  behaviorName: string;
}

export default function ActivitiesPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'money' | 'behavior'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // New activity popup states
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    money: 0,
    positive: true,
    top: false,
    completed: 'false' as 'false' | 'pending' | 'true',
    repeat: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'once',
    behaviorId: ''
  });
  
  // Edit activity states
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState({
    name: '',
    money: 0,
    positive: true,
    top: false,
    completed: 'false' as 'false' | 'pending' | 'true',
    repeat: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'once',
    behaviorId: ''
  });

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchBehaviors();
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!editMode) {
      setShowAddActivity(false);
      setEditingActivityId(null);
    }
  }, [editMode]);

  const fetchBehaviors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/behaviors?userId=${encodeURIComponent(userId!)}`);
      const behaviorsData: Behavior[] = response.data || [];
      setBehaviors(behaviorsData);
      
      // Fetch activities for each behavior
      await fetchAllActivities(behaviorsData);
    } catch (err: any) {
      console.error('Failed to fetch behaviors:', err);
      setError(err.response?.data?.error || 'Failed to fetch behaviors');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllActivities = async (behaviorsData: Behavior[]) => {
    try {
      const allActivities: Activity[] = [];
      
      // Fetch activities for each behavior
      for (const behavior of behaviorsData) {
        try {
          const response = await axios.get(`/api/activities?behaviorId=${encodeURIComponent(behavior.behaviorId)}`);
          const behaviorActivities = response.data || [];
          
          // Add behavior info to each activity
          const activitiesWithBehavior = behaviorActivities.map((activity: Activity) => ({
            ...activity,
            behaviorId: behavior.behaviorId,
            behaviorName: behavior.behaviorName,
          }));
          
          allActivities.push(...activitiesWithBehavior);
        } catch (err) {
          console.error(`Failed to fetch activities for behavior ${behavior.behaviorId}:`, err);
        }
      }
      
      // Fetch standalone activities (not associated with any behavior)
      if (userId) {
        try {
          const standaloneResponse = await axios.get(`/api/activities?userId=${encodeURIComponent(userId)}&standalone=true`);
          const standaloneActivities = standaloneResponse.data || [];
          
          // Add placeholder behavior info for standalone activities
          const activitiesWithPlaceholder = standaloneActivities.map((activity: Activity) => ({
            ...activity,
            behaviorId: null,
            behaviorName: 'No Behavior',
          }));
          
          allActivities.push(...activitiesWithPlaceholder);
        } catch (err) {
          console.error('Failed to fetch standalone activities:', err);
        }
      }
      
      setActivities(allActivities);
    } catch (err: any) {
      console.error('Failed to fetch activities:', err);
      setError('Failed to fetch activities');
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.name.trim()) {
      setError('Activity name is required');
      return;
    }
    
    try {
      await axios.post('/api/activities', {
        behaviorId: newActivity.behaviorId || null,
        activityName: newActivity.name.trim(),
        money: newActivity.money,
        positive: newActivity.positive,
        top: newActivity.top,
        completed: newActivity.completed,
        repeat: newActivity.repeat,
        userId: userId,
      });
      setNewActivity({
        name: '',
        money: 0,
        positive: true,
        top: false,
        completed: 'false',
        repeat: 'none',
        behaviorId: ''
      });
      setShowAddActivity(false);
      // Refetch all activities to show the new one
      fetchBehaviors();
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
      // Refetch all activities to show the updated list
      fetchBehaviors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete activity');
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivityId(activity.activityId);
    setEditingActivity({
      name: activity.activityName,
      money: activity.money,
      positive: activity.positive,
      top: activity.top || false,
      completed: activity.completed || 'false',
      repeat: activity.repeat || 'none',
      behaviorId: activity.behaviorId || ''
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
        top: editingActivity.top,
        completed: editingActivity.completed,
        repeat: editingActivity.repeat,
        behaviorId: editingActivity.behaviorId || null,
      });
      setEditingActivityId(null);
      setEditingActivity({
        name: '',
        money: 0,
        positive: true,
        top: false,
        completed: 'false',
        repeat: 'none',
        behaviorId: ''
      });
      // Refetch all activities to show the updated list
      fetchBehaviors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update activity');
    }
  };

  const handleCancelEditActivity = () => {
    setEditingActivityId(null);
    setEditingActivity({
      name: '',
      money: 0,
      positive: true,
      top: false,
      completed: 'false',
      repeat: 'none',
      behaviorId: ''
    });
  };

  // Filter and sort activities
  const filteredAndSortedActivities = activities
    .filter(activity => {
      // Search filter
      const matchesSearch = activity.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (activity.behaviorName && activity.behaviorName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Type filter
      const matchesType = filterType === 'all' || 
                         (filterType === 'positive' && activity.positive) ||
                         (filterType === 'negative' && !activity.positive);
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      // First sort by 'top' status
      if (a.top && !b.top) return -1;
      if (!a.top && b.top) return 1;
      
      // Then sort by selected criteria
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.activityName.localeCompare(b.activityName);
          break;
        case 'money':
          comparison = a.money - b.money;
          break;
        case 'behavior':
          comparison = (a.behaviorName || '').localeCompare(b.behaviorName || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (isAuthenticated === null || loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto lg: py-6  px-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-2">

      {/* Search and Filter Controls */}
      <div className=" mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities or behaviors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'positive' | 'negative')}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="positive">Positive Only</option>
              <option value="negative">Negative Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <FontAwesomeIcon icon={faSort} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'money' | 'behavior')}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="name">Sort by Name</option>
              <option value="money">Sort by Amount</option>
              <option value="behavior">Sort by Behavior</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faPlus} className="text-green-500 text-2xl mr-3" />
            <div>
              <p className="text-sm text-green-600 font-medium">Positive Activities</p>
              <p className="text-2xl font-bold text-green-800">
                {activities.filter(a => a.positive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faMinus} className="text-red-500 text-2xl mr-3" />
            <div>
              <p className="text-sm text-red-600 font-medium">Negative Activities</p>
              <p className="text-2xl font-bold text-red-800">
                {activities.filter(a => !a.positive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCoins} className="text-blue-500 text-2xl mr-3" />
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Activities</p>
              <p className="text-2xl font-bold text-blue-800">{activities.length}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Add Activity Modal */}
      {editMode && showAddActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddActivity(false)}>
          <div className="bg-white p-6 rounded-lg max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-3 text-colour-1">Add New Activity</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newActivity.name}
                onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                placeholder="Activity name"
                className="w-full p-2 border rounded"
              />
              <select
                value={newActivity.behaviorId}
                onChange={(e) => setNewActivity({ ...newActivity, behaviorId: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a behavior...</option>
                {behaviors.map((behavior) => (
                  <option key={behavior.behaviorId} value={behavior.behaviorId}>
                    {behavior.behaviorName}
                  </option>
                ))}
              </select>
              <div className="flex gap-3">
                <select
                  value={newActivity.positive ? '+' : '-'}
                  onChange={(e) => setNewActivity({ ...newActivity, positive: e.target.value === '+' })}
                  className="p-2 border rounded"
                >
                  <option value="+">+ Earn</option>
                  <option value="-">- Lose</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={newActivity.money}
                  onChange={(e) => setNewActivity({ ...newActivity, money: parseFloat(e.target.value) || 0 })}
                  placeholder="Money amount"
                  className="flex-1 p-2 border rounded"
                />
              </div>
              <div className="flex items-center gap-3">

                <select
                value={newActivity.repeat}
                onChange={(e) => setNewActivity({ ...newActivity, repeat: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'once' })}
                className="flex-1 p-2 border rounded"
              >
                <option value="none">Not Showing on Todo</option>
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                {/* <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option> */}
              </select>
<span>Top:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newActivity.top}
                    onChange={(e) => setNewActivity({ ...newActivity, top: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="relative w-11.5 h-6 bg-gray-200 peer-focus:outline-none  rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-400">
          
                  </div>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddActivity}
                  className="flex-1 btn-1 px-4 py-2 rounded"
                >
                  Add Activity
                </button>
                <button
                  onClick={() => setShowAddActivity(false)}
                  className="px-4 py-2 btn-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activities List */}
      <div className="">


            {editMode && (
              <button
                onClick={() => setShowAddActivity(true)}
                className="btn-1 px-4 py-2 mb-2 rounded-lg font-medium flex items-center  transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} />
                New Activity
              </button>
            )}
 

        {filteredAndSortedActivities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FontAwesomeIcon icon={faSearch} className="text-4xl mb-4" />
            <p>No activities found matching your criteria.</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAndSortedActivities.map((activity) => (
              <div key={activity.activityId} className="group">
                {editMode && editingActivityId === activity.activityId ? (
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingActivity.name}
                        onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="Activity name"
                      />
                      <select
                        value={editingActivity.behaviorId}
                        onChange={(e) => setEditingActivity({ ...editingActivity, behaviorId: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-400"
                      >
                        <option value="">No Behavior</option>
                        {behaviors.map((behavior) => (
                          <option key={behavior.behaviorId} value={behavior.behaviorId}>
                            {behavior.behaviorName}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-3">
                        <select
                          value={editingActivity.positive ? '+' : '-'}
                          onChange={(e) => setEditingActivity({ ...editingActivity, positive: e.target.value === '+' })}
                          className="p-3 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-400"
                        >
                          <option value="+">+ Earn</option>
                          <option value="-">- Lose</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={editingActivity.money}
                          onChange={(e) => setEditingActivity({ ...editingActivity, money: parseFloat(e.target.value) || 0 })}
                          className="flex-1 p-3 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-400"
                          placeholder="Amount"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={editingActivity.repeat}
                          onChange={(e) => setEditingActivity({ ...editingActivity, repeat: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'once' })}
                          className="flex-1 p-3 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-400"
                        >
                          <option value="none">Not Showing on Todo</option>
                          <option value="once">Once</option>
                          <option value="daily">Daily</option>
                        </select>
                        <span>Top:</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingActivity.top}
                            onChange={(e) => setEditingActivity({ ...editingActivity, top: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="relative w-11.5 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-400"></div>
                        </label>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleSaveActivity(activity.activityId)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          <FontAwesomeIcon icon={faCheck} className="mr-2" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEditActivity}
                          className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          <FontAwesomeIcon icon={faTimes} className="mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {activity.activityName}
                            </h3>
                            {activity.top && (
                              <FontAwesomeIcon 
                                icon={faThumbtack} 
                                className="text-blue-500 text-sm" 
                                title="Pinned to top"
                              />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            Behavior: {activity.behaviorName || 'Unknown'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Amount */}
                        <div className="flex items-center space-x-2">
                          <span className={`text-xl font-bold ${
                            activity.positive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {activity.positive ? '+' : '-'}${Math.abs(activity.money).toFixed(2)}
                          </span>
                          <FontAwesomeIcon 
                            icon={faCoins} 
                            className={`text-sm ${
                              activity.positive ? 'text-green-500' : 'text-red-500'
                            }`}
                          />
                        </div>

                        {/* Edit/Delete buttons (visible in edit mode) */}
                        {editMode && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditActivity(activity)}
                              className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-lg shadow-sm transition-colors"
                              title="Edit activity"
                            >
                              <FontAwesomeIcon icon={faEdit} className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(activity.activityId)}
                              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-sm transition-colors"
                              title="Delete activity"
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-sm" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
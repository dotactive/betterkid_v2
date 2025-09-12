'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { usePendingMoney } from '@/hooks/usePendingMoney';
import ImagePicker from '@/components/ImagePicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faMinus, 
  faStar, 
  faExclamationTriangle, 
  faEdit, 
  faTrash, 
  faCheck, 
  faTimes,
  faSmile,
  faCoins,
  faFrown
} from '@fortawesome/free-solid-svg-icons';
import { faFaceSmile } from '@fortawesome/free-solid-svg-icons/faFaceSmile';

interface Activity {
  activityId: string;
  activityName: string;
  money: number;
  positive: boolean;
  top?: boolean;
  pending_quantity: number;
  completed?: 'false' | 'pending' | 'true';
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'once';
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
  const { refreshPendingMoney } = usePendingMoney();
  const { behaviorId } = useParams() as { behaviorId: string };
  const [behavior, setBehavior] = useState<Behavior | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [addActivityForPositive, setAddActivityForPositive] = useState(true);
  const [newActivity, setNewActivity] = useState({
    name: '',
    money: 0,
    positive: true,
    top: false,
    completed: 'false' as 'false' | 'pending' | 'true',
    repeat: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'once'
  });
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState({
    name: '',
    money: 0,
    positive: true,
    top: false,
    completed: 'false' as 'false' | 'pending' | 'true',
    repeat: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'once'
  });
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [editingBannerImage, setEditingBannerImage] = useState<string | null>(null);

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
        positive: addActivityForPositive,
        top: newActivity.top,
        completed: newActivity.completed,
        repeat: newActivity.repeat,
      });
      setNewActivity({ name: '', money: 0, positive: true, top: false, completed: 'false', repeat: 'none' });
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
      positive: activity.positive,
      top: activity.top || false,
      completed: activity.completed || 'false',
      repeat: activity.repeat || 'none'
    });
  };

  const handleSaveActivity = async (activityId: string) => {
    if (!editingActivity.name.trim()) {
      setError('Activity name is required');
      return;
    }
    
    // Find the current activity to preserve its pending_quantity
    const currentActivity = activities.find(a => a.activityId === activityId);
    if (!currentActivity) {
      setError('Activity not found');
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
        pending_quantity: currentActivity.pending_quantity, // Preserve existing pending_quantity
        behaviorId: behaviorId, // Preserve the behavior association
      });
      setEditingActivityId(null);
      setEditingActivity({ name: '', money: 0, positive: true, top: false, completed: 'false', repeat: 'none' });
      fetchActivities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update activity');
    }
  };

  const handleCancelEditActivity = () => {
    setEditingActivityId(null);
    setEditingActivity({ name: '', money: 0, positive: true, top: false, completed: 'false', repeat: 'none' });
  };

  const handlePendingQuantityChange = async (activityId: string, delta: number) => {
    const activity = activities.find(a => a.activityId === activityId);
    if (!activity || !userId) return;

    const newPendingQuantity = Math.max(0, activity.pending_quantity + delta);
    const pendingAmountChange = delta * activity.money * (activity.positive ? 1 : -1);
    
    // Set completed status based on pending quantity
    const newCompletedStatus = newPendingQuantity > 0 ? 'pending' : 'false';
    
    try {
      // Update the activity's pending quantity and completed status
      await axios.put(`/api/activities/${activityId}`, {
        activityName: activity.activityName,
        money: activity.money,
        positive: activity.positive,
        top: activity.top || false,
        pending_quantity: newPendingQuantity,
        completed: newCompletedStatus,
        repeat: activity.repeat,
        behaviorId: behaviorId, // Preserve the behavior association
      });
      
      // Always sync pending money record with current pending quantity
      try {
        // Get existing pending money record for this activity
        const existingPendingResponse = await axios.get(`/api/pending-money?userId=${encodeURIComponent(userId)}`);
        const existingPending = existingPendingResponse.data.find(
          (p: any) => p.type === 'activity' && p.referenceId === activityId
        );

        if (newPendingQuantity > 0) {
          // Calculate total amount and reason based on current pending quantity
          const totalPendingAmount = newPendingQuantity * activity.money * (activity.positive ? 1 : -1);
          const newReason = `${activity.positive ? 'Completed' : 'Did'} "${activity.activityName}" (${newPendingQuantity} time${newPendingQuantity !== 1 ? 's' : ''})`;

          if (existingPending) {
            // Update existing pending money record
            await axios.put(`/api/pending-money?pendingId=${existingPending.pendingId}`, {
              amount: totalPendingAmount,
              reason: newReason,
            });
          } else {
            // Create new pending money record
            await axios.post('/api/pending-money', {
              userId,
              amount: totalPendingAmount,
              reason: newReason,
              type: 'activity',
              referenceId: activityId,
            });
          }
        } else {
          // If pending quantity is 0, delete existing pending money record
          if (existingPending) {
            await axios.delete(`/api/pending-money/${existingPending.pendingId}`, {
              headers: { 'x-userid': userId }
            });
          }
        }
      } catch (err) {
        console.error('Error managing pending money:', err);
        setError('Failed to update pending rewards');
      }
      
      // Update local state
      setActivities(prev => prev.map(a => 
        a.activityId === activityId 
          ? { ...a, pending_quantity: newPendingQuantity }
          : a
      ));
      
      // Refresh global pending money state
      await refreshPendingMoney();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update pending quantity');
    }
  };

  const handleBannerClick = () => {
    if (!editMode) return;
    setEditingBannerImage(behavior?.bannerImage || null);
    setShowBannerPicker(true);
  };

  const handleBannerSelect = async (selectedImage: string | null) => {
    if (!userId || !behavior) return;
    
    try {
      await axios.put(`/api/behaviors/${behavior.behaviorId}`, {
        userId,
        behaviorName: behavior.behaviorName,
        bannerImage: selectedImage,
        thumbImage: behavior.thumbImage,
      });
      setShowBannerPicker(false);
      setEditingBannerImage(null);
      fetchBehavior();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update banner');
    }
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

  // Separate and sort activities (top activities first)
  const sortActivities = (activities: Activity[]) => {
    return activities.sort((a, b) => {
      if (a.top && !b.top) return -1;
      if (!a.top && b.top) return 1;
      return 0;
    });
  };

  const positiveActivities = sortActivities(activities.filter((a) => a.positive));
  const negativeActivities = sortActivities(activities.filter((a) => !a.positive));

  return (
    <div>

      {/* Banner Image Section */}
      {/* {(editMode || behavior.bannerImage) && (
        <div className="mb-6">
          <div 
            className={`relative ${editMode ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={handleBannerClick}
            title={editMode ? 'Click to change banner' : ''}
          >
            {behavior.bannerImage ? (
              <img
                src={behavior.bannerImage}
                alt={`${behavior.behaviorName} banner`}
                className="w-full max-h-60 object-cover rounded-lg shadow-lg"
              />
            ) : editMode ? (
              <div className="w-full h-40 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-400 hover:border-blue-400">
                <div className="text-center">
                  <div className="text-2xl">🖼️</div>
                  <div className="text-sm mt-1">Click to add banner</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )} */}

      {/* <h1 className="text-2xl font-bold mb-8 text-center">{behavior.behaviorName}</h1> */}

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
              <div className="flex gap-3">
                <div className={`p-2 border rounded font-medium ${
                  addActivityForPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {addActivityForPositive ? '+ Earn' : '- Lose'}
                </div>
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
                </select>
                <span>Top:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newActivity.top}
                    onChange={(e) => setNewActivity({ ...newActivity, top: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="relative w-11.5 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-400"></div>
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

      {error && <p className="text-red-600 mb-4 text-center">{error}</p>}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Positive Activities Section */}
        <section className="relative overflow-hidden">
          {/* Header with gradient background */}
          <div className=" background-colour-1 rounded-t-lg p-6 ">
            <div className="flex items-center justify-center space-x-3">
 
              <h2 className="text-2xl font-bold text-white">Good Actions</h2>
            </div>
            <p className="text-green-100 text-center mt-2 text-sm">Earn Super Coins for positive behaviors!</p>
          </div>
          
          {/* Content area */}
          <div className="bg-white rounded-b-lg min-h-[400px] p-4">
            {positiveActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FontAwesomeIcon icon={faPlus} className="text-2xl text-gray-400" />
                </div>
                

                {editMode ? (
                  
                  
                    <button
                      onClick={() => {
                        setAddActivityForPositive(true);
                        setShowAddActivity(true);
                      }}
                      className="cursor-pointer btn-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Add Good Action
                    </button>
                  
                ):(
                  <p className="text-sm text-center mt-1">No good action yet</p>
                )}
                <p className="text-sm text-center mt-1">Add some positive activities to get started.</p>
              </div>
            ) : (
              <div className="">
                {positiveActivities.map((activity) => (
                  <div key={activity.activityId} className="group">
                    {editMode && editingActivityId === activity.activityId ? (
                      <div className="bg-gray-50 rounded-2xl p-4 border-2 border-green-200">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editingActivity.name}
                            onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-green-400 focus:ring-2 focus:ring-green-100"
                            placeholder="Activity name"
                          />
                          <div className="flex gap-3">
                            <select
                              value={editingActivity.positive ? '+' : '-'}
                              onChange={(e) => setEditingActivity({ ...editingActivity, positive: e.target.value === '+' })}
                              className="p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-green-400"
                            >
                              <option value="+">+ Earn</option>
                              <option value="-">- Lose</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={editingActivity.money}
                              onChange={(e) => setEditingActivity({ ...editingActivity, money: parseFloat(e.target.value) || 0 })}
                              className="flex-1 p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-green-400"
                              placeholder="Amount"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`edit-activity-top-${activity.activityId}`}
                              checked={editingActivity.top}
                              onChange={(e) => setEditingActivity({ ...editingActivity, top: e.target.checked })}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <label htmlFor={`edit-activity-top-${activity.activityId}`} className="text-sm text-gray-700">
                              Pin to top
                            </label>
                          </div>
                          <div className="flex gap-3">
                            <select
                              value={editingActivity.completed}
                              onChange={(e) => setEditingActivity({ ...editingActivity, completed: e.target.value as 'false' | 'pending' | 'true' })}
                              className="flex-1 p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-green-400"
                            >
                              <option value="false">Not Started</option>
                              <option value="pending">Pending Approval</option>
                              <option value="true">Completed</option>
                            </select>
                            <select
                              value={editingActivity.repeat}
                              onChange={(e) => setEditingActivity({ ...editingActivity, repeat: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'once' })}
                              className="flex-1 p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-green-400"
                            >
                              <option value="none">None</option>
                              <option value="once">Once</option>
                              <option value="daily">Daily</option>

                            </select>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleSaveActivity(activity.activityId)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                            >
                              <FontAwesomeIcon icon={faCheck} className="mr-2" />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEditActivity}
                              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                            >
                              <FontAwesomeIcon icon={faTimes} className="mr-2" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className=" border-b py-3 border-colour-1 ">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
               
                              <FontAwesomeIcon icon={faFaceSmile} className="text-colour-1 text-4xl mr-5" />
                           
                            <div className="flex-1">
                              <h3 className=" text-gray-800 text-sm">{activity.activityName}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-colour-1 font-bold text-lg">${activity.money.toFixed(2)}</span>
                          
                                <FontAwesomeIcon icon={faCoins} className="mr-1  text-colour-1" />
                           
                              </div>
                              {activity.pending_quantity > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Pending: {activity.pending_quantity} × ${activity.money.toFixed(2)} = ${(activity.pending_quantity * activity.money).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!editMode && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handlePendingQuantityChange(activity.activityId, -1)}
                                  disabled={activity.pending_quantity === 0}
                                  className="btn-2 disabled:bg-gray-300 disabled:cursor-not-allowed text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                  title="Decrease pending"
                                >
                                  <FontAwesomeIcon icon={faMinus} className="text-xs" />
                                </button>
                                <span className="text-sm font-medium min-w-[2rem] text-center">
                                  {activity.pending_quantity}
                                </span>
                                <button
                                  onClick={() => handlePendingQuantityChange(activity.activityId, 1)}
                                  className="btn-1 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                  title="Increase pending"
                                >
                                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                                </button>
                              </div>
                            )}
                            
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
                {editMode && (
                  
                  
                  <button
                    onClick={() => {
                      setAddActivityForPositive(true);
                      setShowAddActivity(true);
                    }}
                    className="mt-4 cursor-pointer btn-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Add Good Action
                  </button>
                
              )}
              </div>
            )}
            
          </div>
        </section>
        
        {/* Negative Activities Section */}
        <section className="relative overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r background-colour-2 rounded-t-lg p-6 ">
            <div className="flex items-center justify-center space-x-3">

              <h2 className="text-2xl font-bold text-white">Actions to Avoid</h2>
            </div>
            <p className="text-red-100 text-center mt-2 text-sm">These behaviors will cost you Super Coins</p>
          </div>
          
          {/* Content area */}
          <div className="bg-white rounded-b-lg  min-h-[400px] p-4">
            {negativeActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FontAwesomeIcon icon={faMinus} className="text-2xl text-gray-400" />
                </div>

                {editMode ? (
            
                    <button
                      onClick={() => {
                        setAddActivityForPositive(false);
                        setShowAddActivity(true);
                      }}
                      className="btn-2  cursor-pointer px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Add Action to Avoid
                    </button>
              
                ):(
<p className="text-center">No negative activities!</p>
                )}
                
                <p className="text-sm text-center mt-1">That's great - keep up the good work!</p>
              </div>
            ) : (
              <div className="">
                {negativeActivities.map((activity) => (
                  <div key={activity.activityId} className="group">
                    {editMode && editingActivityId === activity.activityId ? (
                      <div className="bg-gray-50 rounded-2xl p-4 border-2 border-red-200">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editingActivity.name}
                            onChange={(e) => setEditingActivity({ ...editingActivity, name: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            placeholder="Activity name"
                          />
                          <div className="flex gap-3">
                            <select
                              value={editingActivity.positive ? '+' : '-'}
                              onChange={(e) => setEditingActivity({ ...editingActivity, positive: e.target.value === '+' })}
                              className="p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-red-400"
                            >
                              <option value="+">+ Earn</option>
                              <option value="-">- Lose</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={editingActivity.money}
                              onChange={(e) => setEditingActivity({ ...editingActivity, money: parseFloat(e.target.value) || 0 })}
                              className="flex-1 p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-red-400"
                              placeholder="Amount"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`edit-activity-top-neg-${activity.activityId}`}
                              checked={editingActivity.top}
                              onChange={(e) => setEditingActivity({ ...editingActivity, top: e.target.checked })}
                              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            />
                            <label htmlFor={`edit-activity-top-neg-${activity.activityId}`} className="text-sm text-gray-700">
                              Pin to top
                            </label>
                          </div>
                          <div className="flex gap-3">
                            <select
                              value={editingActivity.completed}
                              onChange={(e) => setEditingActivity({ ...editingActivity, completed: e.target.value as 'false' | 'pending' | 'true' })}
                              className="flex-1 p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-red-400"
                            >
                              <option value="false">Not Started</option>
                              <option value="pending">Pending Approval</option>
                              <option value="true">Completed</option>
                            </select>
                            <select
                              value={editingActivity.repeat}
                              onChange={(e) => setEditingActivity({ ...editingActivity, repeat: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'once' })}
                              className="flex-1 p-3 border border-gray-300 rounded-xl text-gray-900 focus:border-red-400"
                            >
                              <option value="none">None</option>
                              <option value="once">Once</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleSaveActivity(activity.activityId)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                            >
                              <FontAwesomeIcon icon={faCheck} className="mr-2" />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEditActivity}
                              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                            >
                              <FontAwesomeIcon icon={faTimes} className="mr-2" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className=" border-b py-3 border-colour-2 ">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                              <FontAwesomeIcon icon={faFrown} className="text-colour-2 text-4xl mr-5" />
                            <div className="flex-1">
                              <h3 className=" text-gray-800 text-sm">{activity.activityName}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-colour-2 font-bold text-lg">-${activity.money.toFixed(2)}</span>
                                <FontAwesomeIcon icon={faCoins} className="mr-1  text-colour-2" />
                              </div>
                              {activity.pending_quantity > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Pending: {activity.pending_quantity} × ${activity.money.toFixed(2)} = -${(activity.pending_quantity * activity.money).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!editMode && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handlePendingQuantityChange(activity.activityId, -1)}
                                  disabled={activity.pending_quantity === 0}
                                  className="btn-2 disabled:bg-gray-300 disabled:cursor-not-allowed text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                  title="Decrease pending"
                                >
                                  <FontAwesomeIcon icon={faMinus} className="text-xs" />
                                </button>
                                <span className="text-sm font-medium min-w-[2rem] text-center">
                                  {activity.pending_quantity}
                                </span>
                                <button
                                  onClick={() => handlePendingQuantityChange(activity.activityId, 1)}
                                  className="btn-1 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                  title="Increase pending"
                                >
                                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                                </button>
                              </div>
                            )}
                            
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
                {editMode && (
           
                    <button
                      onClick={() => {
                        setAddActivityForPositive(false);
                        setShowAddActivity(true);
                      }}
                      className="btn-2 mt-4 cursor-pointer px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Add Action to Avoid
                    </button>
                
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Banner Image Picker Modal */}
      <ImagePicker
        folder="banner"
        selectedImage={editingBannerImage}
        onSelect={handleBannerSelect}
        isOpen={showBannerPicker}
        onClose={() => {
          setShowBannerPicker(false);
          setEditingBannerImage(null);
        }}
      />
    </div>
  );
}

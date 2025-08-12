'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
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
                <p className="text-center">No good actions yet!</p>
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
                            </div>
                          </div>
                          
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
                    )}
                  </div>
                ))}
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
                  <FontAwesomeIcon icon={faSmile} className="text-2xl text-gray-400" />
                </div>
                <p className="text-center">No negative activities!</p>
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
                            </div>
                          </div>
                          
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
                    )}
                  </div>
                ))}
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

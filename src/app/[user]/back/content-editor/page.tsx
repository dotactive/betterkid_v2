'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import ImagePicker from '@/components/ImagePicker';
import { useAuth } from '@/hooks/useAuth';

interface Behavior {
  behaviorId: string;
  behaviorName: string;
  bannerImage?: string | null;
  thumbImage?: string | null;
}

interface Activity {
  activityId: string;
  activityName: string;
  money: number;
  positive: boolean;
}

export default function ContentEditorPage() {
    
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [activities, setActivities] = useState<{ [behaviorId: string]: Activity[] }>({});
  const [newBehavior, setNewBehavior] = useState('');
  const [newBannerImage, setNewBannerImage] = useState<string | null>(null);
  const [newThumbImage, setNewThumbImage] = useState<string | null>(null);
  const [homepageBanner, setHomepageBanner] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({ name: '', money: 0, positive: true });
  const [editingBehaviorId, setEditingBehaviorId] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { isAuthenticated, username } = useAuth();
  const router = useRouter();
  const params = useParams();


  // Check authentication and fetch data
  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && username) {
      console.log('Fetching data for authenticated user:', username);
      fetchBehaviors();
      fetchHomepageBanner();
    }
  }, [isAuthenticated, username]);

  // Fetch behaviors
  const fetchBehaviors = async () => {
    try {
      if (!username) {
        throw new Error('Username is missing');
      }
      const response = await axios.get(`/api/behaviors?username=${encodeURIComponent(username)}`);
      console.log(`Fetched behaviors for ${username}:`, response.data);
      const fetchedBehaviors = response.data || [];
      const validBehaviors = fetchedBehaviors.filter((behavior: Behavior) => {
        if (!behavior.behaviorId || !behavior.behaviorName) {
          console.warn('Invalid behavior:', behavior);
          return false;
        }
        return true;
      });
      setBehaviors(validBehaviors);
      validBehaviors.forEach((behavior: Behavior) => {
        if (behavior.behaviorId) fetchActivities(behavior);
      });
    } catch (err: any) {
      console.error('Failed to fetch behaviors:', err);
      setError(err.response?.data?.error || 'Failed to fetch behaviors');
    }
  };

  // Fetch activities
  const fetchActivities = async (behavior: Behavior) => {
    try {
      if (!behavior.behaviorId) {
        console.error('Cannot fetch activities: behavior ID is missing');
        return;
      }
      const response = await axios.get(`/api/activities?behaviorId=${encodeURIComponent(behavior.behaviorId)}`);
      console.log(`Fetched activities for behavior ${behavior.behaviorId}:`, response.data);
      setActivities((prev) => ({ ...prev, [behavior.behaviorId]: response.data || [] }));
    } catch (err: any) {
      console.error(`Failed to fetch activities for ${behavior.behaviorId}:`, err);
      setError(err.response?.data?.error || 'Failed to fetch activities');
    }
  };

  // Fetch homepage banner
  const fetchHomepageBanner = async () => {
    try {
      if (!username) {
        throw new Error('Username is missing');
      }
      const response = await axios.get(`/api/homebanner?username=${encodeURIComponent(username)}`);
      console.log(`Fetched homepage banner for ${username}:`, response.data);
      setHomepageBanner(response.data.homepageBanner);
    } catch (err: any) {
      console.error('Failed to fetch homepage banner:', err);
      setError(err.response?.data?.error || 'Failed to fetch homepage banner');
    }
  };

  // Save homepage banner
  const handleHomepageBannerSave = async () => {
    try {
      const payload = { username, homepageBanner };
      console.log('Saving homepage banner:', payload);
      const response = await axios.put('/api/homebanner', payload);
      console.log('Homepage banner saved:', response.data);
      setError('');
      await fetchHomepageBanner();
    } catch (err: any) {
      console.error('Failed to save homepage banner:', err);
      setError(err.response?.data?.error || `Failed to save homepage banner: ${err.message}`);
    }
  };

  // Handle behavior submission
  const handleBehaviorSubmit = async () => {
    if (!newBehavior.trim()) {
      setError('Behavior name is required');
      return;
    }
    try {
      const payload = {
        username,
        behaviorName: newBehavior.trim(),
        bannerImage: newBannerImage,
        thumbImage: newThumbImage,
      };
      if (editingBehaviorId) {
        console.log('Updating behavior with ID:', editingBehaviorId, 'Payload:', payload);
        if (!editingBehaviorId) {
          throw new Error('Editing behavior ID is missing');
        }
        await axios.put(`/api/behaviors/${encodeURIComponent(editingBehaviorId)}`, payload);
      } else {
        console.log('Creating behavior:', payload);
        await axios.post('/api/behaviors', payload);
      }
      setNewBehavior('');
      setNewBannerImage(null);
      setNewThumbImage(null);
      setEditingBehaviorId(null);
      setError('');
      await fetchBehaviors();
    } catch (err: any) {
      console.error('Failed to save behavior:', err);
      setError(err.response?.data?.error || 'Failed to save behavior');
    }
  };

  // Handle activity submission
  const handleActivitySubmit = async (behaviorId: string) => {
    if (!newActivity.name.trim() || newActivity.money < 0) {
      setError('Activity name and valid money are required');
      return;
    }
    if (!behaviorId) {
      setError('Behavior ID is missing for activity');
      return;
    }
    try {
      const payload = {
        behaviorId,
        activityName: newActivity.name.trim(),
        money: newActivity.money,
        positive: newActivity.positive,
      };
      if (editingActivityId) {
        console.log('Updating activity with ID:', editingActivityId, 'Payload:', payload);
        if (!editingActivityId) {
          throw new Error('Editing activity ID is missing');
        }
        await axios.put(`/api/activities/${encodeURIComponent(editingActivityId)}`, payload);
      } else {
        console.log('Creating activity:', payload);
        await axios.post('/api/activities', payload);
      }
      setNewActivity({ name: '', money: 0, positive: true });
      setEditingActivityId(null);
      setError('');
      // Find the full behavior object to pass to fetchActivities
      const behavior = behaviors.find((b) => b.behaviorId === behaviorId);
      if (behavior) {
        await fetchActivities(behavior);
      }
    } catch (err: any) {
      console.error('Failed to save activity:', err);
      setError(err.response?.data?.error || 'Failed to save activity');
    }
  };

  // Edit behavior
  const handleEditBehavior = (behavior: Behavior) => {
    console.log('Editing behavior:', behavior);
    if (!behavior.behaviorId || !behavior.behaviorName) {
      setError('Invalid behavior data');
      return;
    }
    setNewBehavior(behavior.behaviorName);
    setNewBannerImage(behavior.bannerImage || null);
    setNewThumbImage(behavior.thumbImage || null);
    setEditingBehaviorId(behavior.behaviorId);
    setError('');
  };

  // Edit activity
  const handleEditActivity = (activity: Activity) => {
    console.log('Editing activity:', activity);
    if (!activity.activityId || !activity.activityName) {
      setError('Invalid activity data');
      return;
    }
    setNewActivity({
      name: activity.activityName,
      money: activity.money,
      positive: activity.positive,
    });
    setEditingActivityId(activity.activityId);
    setError('');
  };

  // Delete behavior
  const handleDeleteBehavior = async (behaviorId: string) => {
    if (!confirm(`Delete behavior ${behaviorId}?`)) return;
    if (!behaviorId) {
      setError('Behavior ID is missing');
      console.error('Delete behavior failed: missing behaviorId');
      return;
    }
    try {
      console.log('Deleting behavior with ID:', behaviorId, 'for username:', username);
      await axios.delete(`/api/behaviors/${encodeURIComponent(behaviorId)}`, {
        headers: { 'x-username': username },
      });
      await fetchBehaviors();
      setError('');
    } catch (err: any) {
      console.error('Failed to delete behavior:', err);
      setError(err.response?.data?.error || 'Failed to delete behavior');
    }
  };

  // Delete activity
  const handleDeleteActivity = async (behaviorId: string, activityId: string) => {
    if (!confirm(`Delete activity ${activityId}?`)) return;
    if (!activityId) {
      setError('Activity ID is missing');
      console.error('Delete activity failed: missing activityId');
      return;
    }
    if (!behaviorId) {
      setError('Behavior ID is missing');
      console.error('Delete activity failed: missing behaviorId');
      return;
    }
    try {
      console.log('Deleting activity with ID:', activityId, 'for behavior:', behaviorId);
      await axios.delete(`/api/activities/${encodeURIComponent(activityId)}`);
      const behaviorObj = behaviors.find((b) => b.behaviorId === behaviorId);
      if (behaviorObj) {
        await fetchActivities(behaviorObj);
      }
      setError('');
    } catch (err: any) {
      console.error('Failed to delete activity:', err);
      setError(err.response?.data?.error || 'Failed to delete activity');
    }
  };

  if (isAuthenticated === null) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {behaviors.map((behavior) => (
            <div key={behavior.behaviorId} className="bg-white rounded-lg shadow p-4 hover:bg-yellow-100 cursor-pointer">
              {behavior.thumbImage ? (
                <img
                  src={behavior.thumbImage}
                  alt={`${behavior.behaviorName} thumbnail`}
                    className="w-full  object-cover rounded-md mb-2 group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="w-full  bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-500">
                    No Thumbnail
                  </div>
                )}
                <h3 className="text-lg font-medium text-gray-900 truncate">{behavior.behaviorName}</h3>
              </div>
          ))}
          <div  className="bg-white rounded-lg shadow p-4 hover:bg-yellow-100 cursor-pointer">
            <i className="fa-solid fa-plus"></i>
            <h3 className="text-lg font-medium text-gray-900 truncate">New Behavior</h3>
          </div>

        </div>


      <div className="mb-5">

      {error && <p className="text-red-600">{error}</p>}
      <div className="hidden homebanner mb-5">
        <h2 className="text-xl font-semibold mb-2">Homepage Banner</h2>
        {homepageBanner && (
          <div className="my-2">
            <img
              src={homepageBanner}
              alt="Homepage Banner"
              className="w-72 h-auto"
            />
          </div>
        )}
        <ImagePicker
          folder="banner"
          selectedImage={homepageBanner}
          onSelect={setHomepageBanner}
        />
        <button
          onClick={handleHomepageBannerSave}
          className="px-4 py-2 bg-blue-600 text-white rounded mt-2"
        >
          Save Homepage Banner
        </button>
      </div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold mb-2">Manage Behaviors</h2>
        <input
          type="text"
          value={newBehavior}
          onChange={(e) => setNewBehavior(e.target.value)}
          placeholder="Behavior Name"
          className="w-72 px-3 py-2 mr-2 border border-gray-300 rounded"
        />
        <ImagePicker
          folder="banner"
          selectedImage={newBannerImage}
          onSelect={setNewBannerImage}
        />
        <ImagePicker
          folder="thumb"
          selectedImage={newThumbImage}
          onSelect={setNewThumbImage}
        />
        <button
          onClick={handleBehaviorSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded ml-2"
        >
          {editingBehaviorId ? 'Update Behavior' : 'Add Behavior'}
        </button>
        {editingBehaviorId && (
          <button
            onClick={() => {
              setNewBehavior('');
              setNewBannerImage(null);
              setNewThumbImage(null);
              setEditingBehaviorId(null);
              setError('');
            }}
            className="px-4 py-2 ml-2 bg-gray-300 rounded"
          >
            Cancel
          </button>
        )}
        <div className="mt-5">
          {behaviors.length === 0 ? (
            <p>No behaviors found.</p>
          ) : (
            behaviors.map((behavior) => (
              <div
                key={behavior.behaviorId}
                className="mb-2 border border-gray-200 rounded p-3"
              >
                <h3 className="font-semibold">{behavior.behaviorName}</h3>
                {behavior.bannerImage && (
                  <img
                    src={behavior.bannerImage}
                    alt="Banner"
                    className="w-52 h-auto my-2"
                  />
                )}
                {behavior.thumbImage && (
                  <img
                    src={behavior.thumbImage}
                    alt="Thumbnail"
                    className="w-12 h-auto my-2"
                  />
                )}
                <button
                  onClick={() => handleEditBehavior(behavior)}
                  className="mr-2 px-2 py-1 bg-gray-200 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteBehavior(behavior.behaviorId)}
                  className="px-2 py-1 bg-red-600 text-white rounded"
                >
                  Delete
                </button>
                <div className="mt-2">
                  <h4 className="font-medium">Add Activity</h4>
                  <input
                    type="text"
                    value={newActivity.name}
                    onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                    placeholder="Activity Name"
                    className="w-52 px-3 py-2 mr-2 border border-gray-300 rounded"
                  />
                  <input
                    type="number"
                    value={newActivity.money}
                    onChange={(e) => setNewActivity({ ...newActivity, money: parseFloat(e.target.value) || 0 })}
                    placeholder="Money"
                    className="w-24 px-3 py-2 mr-2 border border-gray-300 rounded"
                  />
                  <label className="mr-2">
                    Positive:
                    <input
                      type="checkbox"
                      checked={newActivity.positive}
                      onChange={(e) => setNewActivity({ ...newActivity, positive: e.target.checked })}
                      className="ml-1"
                    />
                  </label>
                  <button
                    onClick={() => handleActivitySubmit(behavior.behaviorId)}
                    className="px-4 py-2 ml-2 bg-blue-600 text-white rounded"
                  >
                    {editingActivityId === (activities[behavior.behaviorId]?.find(a => a.activityId === editingActivityId)?.activityId) ? 'Update Activity' : 'Add Activity'}
                  </button>
                  {editingActivityId && (
                    <button
                      onClick={() => {
                        setNewActivity({ name: '', money: 0, positive: true });
                        setEditingActivityId(null);
                        setError('');
                      }}
                      className="px-4 py-2 ml-2 bg-gray-300 rounded"
                    >
                      Cancel
                    </button>
                  )}
                  <div className="mt-2">
                    <h4 className="font-medium">Activities</h4>
                    {(!activities[behavior.behaviorId] || activities[behavior.behaviorId].length === 0) ? (
                      <p>No activities found.</p>
                    ) : (
                      activities[behavior.behaviorId].map((activity) => (
                        <div
                          key={activity.activityId}
                          className="mb-1"
                        >
                          <span>
                            {activity.activityName} - ${activity.money} (
                            {activity.positive ? 'Positive' : 'Negative'})
                          </span>
                          <button
                            onClick={() => handleEditActivity(activity)}
                            className="ml-2 px-2 py-1 bg-gray-200 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(behavior.behaviorId, activity.activityId)}
                            className="ml-1 px-2 py-1 bg-red-600 text-white rounded"
                          >
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { usePendingMoney } from '@/hooks/usePendingMoney';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faClock } from '@fortawesome/free-solid-svg-icons';

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

export default function TodoListPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const { addToPending, removeFromPending, refreshPendingMoney } = usePendingMoney();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const resetTime = '22:00'; // Fixed reset time at 10:00 PM for all users
  const [uncompletedCount, setUncompletedCount] = useState(0);
  const [completeAward, setCompleteAward] = useState(0);
  const [uncompleteFine, setUncompleteFine] = useState(0);
  const [autoReset, setAutoReset] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchActivities();
      fetchUserSettings();
    }
    // Initialize countdown timer immediately
    updateCountdown();
  }, [isAuthenticated, userId]);

  useEffect(() => {
    // Update countdown every second
    const countdownInterval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [isAuthenticated, userId]);

  // Update countdown when resetTime changes or initially when component mounts
  useEffect(() => {
    updateCountdown();
  }, [resetTime]);

  const fetchActivities = async () => {
    if (!userId) return;
    try {
      // Get all activities from all behaviors for this user
      const behaviorsResponse = await axios.get(`/api/behaviors?userId=${encodeURIComponent(userId)}`);
      const behaviors = behaviorsResponse.data || [];
      
      let allActivities: Activity[] = [];
      
      // Fetch activities for each behavior
      for (const behavior of behaviors) {
        try {
          const activitiesResponse = await axios.get(`/api/activities?behaviorId=${encodeURIComponent(behavior.behaviorId)}`);
          const behaviorActivities = activitiesResponse.data || [];
          allActivities = allActivities.concat(behaviorActivities);
        } catch (err) {
          console.error(`Failed to fetch activities for behavior ${behavior.behaviorId}:`, err);
        }
      }
      
      // Filter activities where repeat is not 'none'
      const repeatableActivities = allActivities.filter(activity => 
        activity.repeat && activity.repeat !== 'none'
      );
      
      setActivities(repeatableActivities);
      
      // Count uncompleted daily activities
      const uncompletedDaily = repeatableActivities.filter(
        (activity: Activity) => activity.repeat === 'daily' && activity.completed === 'false'
      ).length;
      setUncompletedCount(uncompletedDaily);
    } catch (err: any) {
      console.error('Failed to fetch activities:', err);
      setError(err.response?.data?.error || 'Failed to fetch activities');
    }
  };

  const fetchUserSettings = async () => {
    if (!userId) return;
    console.log('fetchUserSettings called for userId:', userId);
    try {
      const response = await axios.get(`/api/users/${encodeURIComponent(userId)}/settings`);
      const settings = response.data;
      console.log('settings response:', settings);
      
      // Update all settings from database
      setUncompleteFine(settings.uncompleteFine !== undefined ? settings.uncompleteFine : 0);
      setCompleteAward(settings.completeAward !== undefined ? settings.completeAward : 0);
      setAutoReset(settings.autoReset !== undefined ? settings.autoReset : false);
      setSettingsLoaded(true);
      // Trigger countdown update with fixed reset time
      updateCountdown();
    } catch (err: any) {
      console.error('Failed to fetch user settings:', err);
      setSettingsLoaded(true); // Still mark as loaded even if failed
      // Don't set error state here since this is not critical
    }
  };


  const handleCompleteAwardChange = async (newCompleteAward: number) => {
    setCompleteAward(newCompleteAward);
    
    // Update in database
    if (userId) {
      try {
        await axios.put(`/api/users/${encodeURIComponent(userId)}/settings`, {
          completeAward: newCompleteAward
        });
      } catch (err: any) {
        console.error('Failed to update complete award:', err);
        setError('Failed to save complete award');
      }
    }
  };

  const handleUncompleteFineChange = async (newUncompleteFine: number) => {
    setUncompleteFine(newUncompleteFine);
    
    // Update in database
    if (userId) {
      try {
        await axios.put(`/api/users/${encodeURIComponent(userId)}/settings`, {
          uncompleteFine: newUncompleteFine
        });
      } catch (err: any) {
        console.error('Failed to update incomplete fine:', err);
        setError('Failed to save incomplete fine');
      }
    }
  };

  const handleAutoResetChange = async (newAutoReset: boolean) => {
    setAutoReset(newAutoReset);
    
    // Update in database
    if (userId) {
      try {
        await axios.put(`/api/users/${encodeURIComponent(userId)}/settings`, {
          autoReset: newAutoReset
        });
      } catch (err: any) {
        console.error('Failed to update auto reset:', err);
        setError('Failed to save auto reset setting');
      }
    }
  };


  const updateCountdown = () => {
    const now = new Date();
    
    console.log('updateCountdown using fixed reset time: ' + resetTime);
    
    // Parse reset time (e.g., "22:00" -> hour: 22, minute: 0)
    const [hour, minute] = resetTime.split(':').map(Number);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    
    let nextResetTime: Date;
    
    // If current time is before reset time today, next reset is today
    if (now < today) {
      nextResetTime = today;
    } else {
      // Otherwise, next reset is tomorrow at the same time
      nextResetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute, 0);
    }
    
    const timeUntilReset = nextResetTime.getTime() - now.getTime();
    
    if (timeUntilReset > 0) {
      const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeUntilReset % (1000 * 60)) / 1000);
      
      setCountdown({ hours, minutes, seconds });
    } else {
      setCountdown({ hours: 0, minutes: 0, seconds: 0 });
    }
  };

  const handlePendingQuantityChange = async (activityId: string, delta: number) => {
    const activity = activities.find(a => a.activityId === activityId);
    if (!activity || !userId) return;

    const newPendingQuantity = Math.max(0, activity.pending_quantity + delta);
    
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
      }
      
      // Update local state
      setActivities(prev => prev.map(a => 
        a.activityId === activityId 
          ? { ...a, pending_quantity: newPendingQuantity, completed: newCompletedStatus }
          : a
      ));
      
      // Refresh global pending money state
      await refreshPendingMoney();
    } catch (err: any) {
      console.error('Error updating activity:', err);
    }
  };



  const getRepeatColor = (repeat: string) => {
    switch (repeat) {
      case 'daily': return 'bg-green-100 text-green-800';
      case 'weekly': return 'bg-blue-100 text-blue-800';
      case 'monthly': return 'bg-purple-100 text-purple-800';
      case 'once': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
          
        {error && <p className="text-red-600 mb-4 p-3 bg-red-50 rounded">{error}</p>}
        {resetStatus && <p className="mb-4 p-3 bg-blue-50 rounded text-blue-800">{resetStatus}</p>}
        
        {/* Countdown Timer */}
        <div className={`p-4 rounded-lg mb-6 border ${
          uncompletedCount > 0 
            ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-1 ${
                uncompletedCount > 0 ? 'text-red-800' : 'text-blue-800'
              }`}>
                <FontAwesomeIcon icon={faClock} className="text-xl" /> Next Reset: {resetTime} 
              </h3>
              {editMode ? (
                <div className="space-y-2">
 
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Complete Award: $</span>
                    <input
                      type="number"
                      value={completeAward}
                      onChange={(e) => handleCompleteAwardChange(Number(e.target.value))}
                      step="0.1"
                      min="0"
                      className="px-2 py-1 border rounded text-sm w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Incomplete Fine: $</span>
                    <input
                      type="number"
                      value={uncompleteFine}
                      onChange={(e) => handleUncompleteFineChange(Number(e.target.value))}
                      step="0.1"
                      min="0"
                      className="px-2 py-1 border rounded text-sm w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Auto Reset:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoReset}
                        onChange={(e) => handleAutoResetChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="text-xs text-gray-600 ml-1">{autoReset ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
              ) : (
                <div>

                  {/* Show earn message if completeAward > 0 */}
                  {completeAward > 0 && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      💰 You will earn ${completeAward} for each completed task after {resetTime}
                    </p>
                  )}
                  {/* Show lose message if uncompleteFine > 0 and there are uncompleted tasks */}
                  {uncompleteFine > 0 && uncompletedCount > 0 && (
                    <p className="text-sm text-red-600 font-medium mt-1">
                      ⚠️ You have {uncompletedCount} uncompleted task{uncompletedCount !== 1 ? 's' : ''}, you will lose ${uncompleteFine} after {resetTime}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-2xl font-mono font-bold text-blue-800">
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
                {countdown.hours.toString().padStart(2, '0')}
                <div className="text-xs text-blue-600 font-normal">HRS</div>
              </div>
              <div className="text-blue-400">:</div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
                {countdown.minutes.toString().padStart(2, '0')}
                <div className="text-xs text-blue-600 font-normal">MIN</div>
              </div>
              <div className="text-blue-400">:</div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
                {countdown.seconds.toString().padStart(2, '0')}
                <div className="text-xs text-blue-600 font-normal">SEC</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Daily Reset Button - Only in Edit Mode */}
        {editMode && (
          <div className="bg-orange-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-orange-800 mb-3">Daily Reset</h2>
            <button
              onClick={async () => {
                const confirmed = confirm(
                  'Are you sure you want to run the daily reset?\n\n' +
                  'This will:\n' +
                  '• Approve all pending activities\n' +
                  '• Reset daily activities to incomplete\n' +
                  '• Clean up pending money records\n\n' +
                  'This action cannot be undone.'
                );
                
                if (!confirmed) {
                  return;
                }

                try {
                  setResetStatus('Running daily reset...');
                  const response = await axios.get('/api/cron/daily-reset');
                  if (response.data.success) {
                    setResetStatus('✅ Daily reset completed successfully');
                    fetchActivities(); // Refresh activities
                  } else {
                    setResetStatus('❌ Daily reset failed');
                  }
                } catch (error) {
                  console.error('Daily reset error:', error);
                  setResetStatus('❌ Daily reset failed');
                }
                setTimeout(() => setResetStatus(''), 5000);
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔄 Run Daily Reset
            </button>
            <p className="text-sm text-orange-700 mt-2">
              ℹ️ This will approve all pending activities, reset daily activities to incomplete, and clean up pending money records. Note: The automatic daily reset only runs for users with Auto Reset enabled.
            </p>
          </div>
        )}

        {/* Activity List */}
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>No repeating activities yet! {editMode ? 'Go to behaviors page to add activities with repeat schedules.' : 'Ask a parent to add some repeating activities for you.'}</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.activityId} className={`border rounded-lg p-4 transition-all ${
                activity.completed === 'true' ? 'bg-green-50 border-green-200' :
                activity.completed === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Quantity Controls */}

                    <div className="flex-1">
                      <p className={`text-lg ${
                        activity.completed === 'true' ? 'line-through text-gray-500' :
                        activity.completed === 'pending' ? 'text-yellow-700 font-medium' :
                        'text-gray-900'
                      }`}>
                        {activity.activityName}
                        {activity.completed === 'pending' && <span className="ml-2 text-xs text-yellow-600">(Pending Approval)</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">🪙</span>
                          <span className="text-sm font-medium text-gray-700">
                            {activity.positive ? '+' : '-'}${activity.money} coins
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRepeatColor(activity.repeat || 'none')}`}>
                          {activity.repeat}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activity.completed === 'true' ? 'bg-green-100 text-green-800' :
                          activity.completed === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.completed === 'true' ? '✅ Approved' :
                           activity.completed === 'pending' ? '⏳ Pending' :
                           '📝 Todo'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePendingQuantityChange(activity.activityId, -1)}
                        disabled={activity.pending_quantity === 0}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
                        title="Decrease quantity"
                      >
                        <FontAwesomeIcon icon={faMinus} className="text-xs" />
                      </button>
                      <span className="min-w-[40px] text-center font-semibold text-lg">
                        {activity.pending_quantity || 0}
                      </span>
                      <button
                        onClick={() => handlePendingQuantityChange(activity.activityId, 1)}
                        className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                        title="Increase quantity"
                      >
                        <FontAwesomeIcon icon={faPlus} className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
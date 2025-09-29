'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import { usePendingMoney } from '@/hooks/usePendingMoney';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faClock, faCog } from '@fortawesome/free-solid-svg-icons';

interface Activity {
  activityId: string;
  activityName: string;
  money: number;
  positive: boolean;
  top?: boolean;
  pending_quantity: number;
  completed?: 'false' | 'pending' | 'true';
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'once';
  behaviorId?: string;
}

export default function TodoListPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const { addToPending, removeFromPending, refreshPendingMoney } = usePendingMoney();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const resetTime = '22:00'; // Fixed reset time at 10:00 PM for all users
  const [uncompletedCount, setUncompletedCount] = useState(0);
  const [completeAward, setCompleteAward] = useState(0);
  const [uncompleteFine, setUncompleteFine] = useState(0);
  const [autoReset, setAutoReset] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

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
          // Add behaviorId to each activity
          const activitiesWithBehaviorId = behaviorActivities.map((activity: Activity) => ({
            ...activity,
            behaviorId: behavior.behaviorId
          }));
          allActivities = allActivities.concat(activitiesWithBehaviorId);
        } catch (err) {
          console.error(`Failed to fetch activities for behavior ${behavior.behaviorId}:`, err);
        }
      }
      
      // Also fetch standalone activities (not associated with any behavior)
      try {
        const standaloneResponse = await axios.get(`/api/activities?userId=${encodeURIComponent(userId)}&standalone=true`);
        const standaloneActivities = standaloneResponse.data || [];
        // Add these activities without behaviorId (they are standalone)
        allActivities = allActivities.concat(standaloneActivities);
      } catch (err) {
        console.error('Failed to fetch standalone activities:', err);
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
    
    // Update local state immediately for better UX
    const updatedActivities: Activity[] = activities.map(a => 
      a.activityId === activityId 
        ? { ...a, pending_quantity: newPendingQuantity, completed: newCompletedStatus }
        : a
    );
    setActivities(updatedActivities);
    
    // Update uncompleted count for daily activities
    const uncompletedDaily = updatedActivities.filter(
      (activity: Activity) => activity.repeat === 'daily' && activity.completed === 'false'
    ).length;
    setUncompletedCount(uncompletedDaily);
    
    try {
      // Update the activity's pending quantity and completed status in database
      await axios.put(`/api/activities/${activityId}`, {
        activityName: activity.activityName,
        money: activity.money,
        positive: activity.positive,
        top: activity.top || false,
        pending_quantity: newPendingQuantity,
        completed: newCompletedStatus,
        repeat: activity.repeat,
        behaviorId: activity.behaviorId, // Preserve the behavior association
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
        
        // Refresh global pending money state only after successful sync
        await refreshPendingMoney();
      } catch (pendingErr) {
        console.error('Error managing pending money:', pendingErr);
        // If pending money sync fails, revert the local state to maintain consistency
        setActivities(activities);
        const originalUncompletedDaily = activities.filter(
          (activity: Activity) => activity.repeat === 'daily' && activity.completed === 'false'
        ).length;
        setUncompletedCount(originalUncompletedDaily);
        throw pendingErr; // Re-throw to be caught by outer catch
      }
      
    } catch (err: any) {
      console.error('Error updating activity:', err);
      // If database update fails, revert the local state
      setActivities(activities);
      const originalUncompletedDaily = activities.filter(
        (activity: Activity) => activity.repeat === 'daily' && activity.completed === 'false'
      ).length;
      setUncompletedCount(originalUncompletedDaily);
      // Show error message to user
      setError(`Failed to update activity: ${err.response?.data?.error || err.message}`);
      setTimeout(() => setError(''), 3000);
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

      <div className="bg-white rounded-lg shadow-lg p-6">
          
        {error && <p className="text-red-600 mb-4 p-3 bg-red-50 rounded">{error}</p>}
        
        {/* Countdown Timer */}
        <div className={`p-4 rounded-lg mb-6 border ${
          uncompletedCount > 0 
            ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
        }`}>

              {editMode ? (
                <div>
           
                  <h3 className="text-lg font-semibold mb-2">
                    <FontAwesomeIcon icon={faCog} className="text-xl" /> Reset Settings: 
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-green-700 uppercase tracking-wide">
                        Complete Award
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-medium">$</span>
                        <input
                          type="number"
                          value={completeAward}
                          onChange={(e) => handleCompleteAwardChange(Number(e.target.value))}
                          step="0.1"
                          min="0"
                          className="w-full pl-8 pr-3 py-2 border-2 border-green-200 rounded-lg text-sm font-medium text-green-800 bg-green-50 focus:border-green-400 focus:ring-2 focus:ring-green-100 focus:outline-none transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-red-700 uppercase tracking-wide">
                        Incomplete Fine
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-600 font-medium">$</span>
                        <input
                          type="number"
                          value={uncompleteFine}
                          onChange={(e) => handleUncompleteFineChange(Number(e.target.value))}
                          step="0.1"
                          min="0"
                          className="w-full pl-8 pr-3 py-2 border-2 border-red-200 rounded-lg text-sm font-medium text-red-800 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-wide">
                    Auto Reset on 22:00
                      </label>
                      <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoReset}
                        onChange={(e) => handleAutoResetChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-16 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-300"></div>
                    </label>
                    <div className="text-xs text-gray-600 font-medium">{autoReset ? 'ON' : 'OFF'}</div>
                  </div>
                  </div>

                  </div>

                </div>
              ) : (
                <div className="flex items-center justify-between grid grid-cols-1 sm:grid-cols-2 gap-6 ">
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-1 ${
                    uncompletedCount > 0 ? 'text-red-800' : 'text-blue-800'
                  }`}>
                    <FontAwesomeIcon icon={faClock} className="text-xl" /> Next Reset: {resetTime} 
                  </h3>
                <div>

                  {/* Show earn message if completeAward > 0 */}
                  {completeAward > 0 && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      You will earn ${completeAward} for completing all daily activities after {resetTime}
                    </p>
                  )}
                  {/* Show lose message if uncompleteFine > 0 and there are uncompleted tasks */}
                  {uncompleteFine > 0 && uncompletedCount > 0 && (
                    <p className="text-sm text-red-600 font-medium mt-1">
                      You have {uncompletedCount} uncompleted activitie{uncompletedCount !== 1 ? 's' : ''}, you will lose ${uncompleteFine} after {resetTime}
                    </p>
                  )}
                </div>
                </div>
            <div className="text-right items-center gap-2 text-2xl font-mono font-bold text-blue-800">
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border inline-block">
                {countdown.hours.toString().padStart(2, '0')}
                <div className="text-xs text-blue-600 font-normal inline-block pl-1">HRS</div>
              </div>
              <div className="text-blue-400  inline-block">:</div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border inline-block">
                {countdown.minutes.toString().padStart(2, '0')}
                <div className="text-xs text-blue-600 font-normal inline-block pl-1">MIN</div>
              </div>
              <div className="text-blue-400 inline-block">:</div>
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border inline-block">
                {countdown.seconds.toString().padStart(2, '0')}
                <div className="text-xs text-blue-600 font-normal  inline-block pl-1">SEC</div>
              </div>
            </div>
          </div>
              )}

        </div>
        
        {/* Loading/Success Popup */}
        {(isResetting || resetComplete) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
              {resetComplete ? (
                <>
                  <div className="text-green-500 text-6xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold mb-2 text-green-700">Daily Reset Completed!</h3>
                  <p className="text-gray-600 mb-4">Your daily activities have been successfully reset.</p>
                  <button
                    onClick={() => {
                      setResetComplete(false);
                      window.location.reload();
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Continue
                  </button>
                </>
              ) : (
                <>
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold mb-2">Running Daily Reset</h3>
                  <p className="text-gray-600">Please wait while we process your daily reset...</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Daily Reset Button - Only in Edit Mode */}
        {editMode && (

            <button
              onClick={async () => {
                const confirmed = confirm(
                  'Are you sure you want to run the daily reset?\n\n' +
                  'This will:\n' +
                  '• Approve pending rewards for TODO PAGE activities only\n' +
                  '• Check if all daily activities on this page are complete\n' +
                  '• Award complete bonus OR apply incomplete fine\n' +
                  '• Reset daily activities to incomplete\n\n' +
                  'Note: This only affects activities shown on this todo page.\n' +
                  'This action cannot be undone.'
                );

                if (!confirmed) {
                  return;
                }

                setIsResetting(true);

                try {
                  // Step 1: Approve only todo page activities (activities with repeat schedules)
                  let approvedCount = 0;
                  try {
                    const pendingResponse = await axios.get(`/api/pending-money?userId=${encodeURIComponent(userId!)}`);
                    const pendingItems = pendingResponse.data || [];
                    
                    // Filter to only include pending items related to todo page activities (activities with repeat schedules)
                    const todoPageActivityIds = activities.map(activity => activity.activityId);
                    const todoPendingItems = pendingItems.filter((item: any) => 
                      item.type === 'activity' && todoPageActivityIds.includes(item.referenceId)
                    );
                    
                    // Get current balance
                    const balanceResponse = await axios.get(`/api/user-balance?userId=${encodeURIComponent(userId!)}`);
                    let currentBalance = balanceResponse.data.balance || 0;
                    
                    for (const item of todoPendingItems) {
                      try {
                        // Add pending amount to current balance
                        currentBalance += item.amount;
                        await axios.put('/api/user-balance', {
                          userId: userId,
                          balance: currentBalance,
                          reason: `Approved: ${item.reason}`
                        });
                        
                        await axios.delete(`/api/pending-money/${item.pendingId}`, {
                          headers: { 'x-userid': userId }
                        });
                        approvedCount++;
                      } catch (err) {
                        console.error('Error approving pending item:', err);
                      }
                    }
                  } catch (err) {
                    console.error('Error processing pending rewards:', err);
                  }

                  // Step 2: Check completion status and apply awards/fines
                  const dailyActivities = activities.filter(activity => activity.repeat === 'daily');
                  const uncompletedDaily = dailyActivities.filter(activity => 
                    activity.completed === 'false'
                  );
                  
                  let awardMessage = '';
                  if (dailyActivities.length > 0) {
                    // Get fresh balance after pending approvals
                    const balanceResponse = await axios.get(`/api/user-balance?userId=${encodeURIComponent(userId!)}`);
                    let currentBalance = balanceResponse.data.balance || 0;
                    console.log('Current balance before awards/fines:', currentBalance);
                    
                    if (uncompletedDaily.length === 0 && completeAward > 0) {
                      // All daily activities completed - give award
                      try {
                        const newBalance = currentBalance + completeAward;
                        console.log(`Applying completion bonus: ${currentBalance} + ${completeAward} = ${newBalance}`);
                        await axios.put('/api/user-balance', {
                          userId: userId,
                          balance: newBalance,
                          reason: `Daily completion bonus: All ${dailyActivities.length} activities completed (+$${completeAward})`
                        });
                        awardMessage = `\n• Earned $${completeAward} completion bonus!`;
                      } catch (err) {
                        console.error('Error applying complete award:', err);
                      }
                    } else if (uncompletedDaily.length > 0 && uncompleteFine > 0) {
                      // Some activities incomplete - apply fine
                      const totalFine = uncompletedDaily.length * uncompleteFine;
                      try {
                        const newBalance = currentBalance - totalFine;
                        console.log(`Applying incomplete fine: ${currentBalance} - ${totalFine} = ${newBalance}`);
                        await axios.put('/api/user-balance', {
                          userId: userId,
                          balance: newBalance,
                          reason: `Daily incomplete fine: ${uncompletedDaily.length} activities not completed ($${uncompleteFine} per activity = $${totalFine} total)`
                        });
                        awardMessage = `\n• Applied $${totalFine} incomplete fine`;
                      } catch (err) {
                        console.error('Error applying incomplete fine:', err);
                      }
                    }
                  }

                  // Step 3: Reset daily activities
                  const response = await axios.post('/api/todos/reset', {
                    resetType: 'daily',
                    userId: userId
                  });
                  
                  if (response.data.resetCount !== undefined) {
                    setIsResetting(false);
                    setResetComplete(true);
                  } else {
                    setIsResetting(false);
                    alert('❌ Daily reset failed - Please try again');
                  }
                } catch (error: any) {
                  setIsResetting(false);
                  console.error('Daily reset error:', error);
                  alert(`❌ Daily reset failed: ${error.response?.data?.error || 'Unknown error'}`);
                }
              }}
              className="btn-2 px-6 py-3 rounded-lg font-medium transition-colors mb-2"
            >
             Run Daily Reset
            </button>

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
                        className="w-8 h-8 btn-2 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
                        title="Decrease quantity"
                      >
                        <FontAwesomeIcon icon={faMinus} className="text-xs" />
                      </button>
                      <span className="min-w-[40px] text-center font-semibold text-lg">
                        {activity.pending_quantity || 0}
                      </span>
                      <button
                        onClick={() => handlePendingQuantityChange(activity.activityId, 1)}
                        className="w-8 h-8 btn-1 text-white rounded-full flex items-center justify-center transition-colors"
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

  );
}
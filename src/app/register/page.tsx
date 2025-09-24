'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImagePicker from '@/components/ImagePicker';

interface NewBehavior {
  id: string;
  name: string;
  bannerImage?: string;
  thumbImage?: string;
}

interface NewActivity {
  id: string;
  name: string;
  money: number;
  positive: boolean;
  behaviorId?: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'once';
}

export default function RegisterPage() {
  // Step management
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [registeredUserId, setRegisteredUserId] = useState<string>('');

  // Step 1 - Registration data
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [retypePassword, setRetypePassword] = useState<string>('');
  const [parentCode, setParentCode] = useState<string>('');

  // Step 2 - Behavior creation
  const [behaviors, setBehaviors] = useState<NewBehavior[]>([]);
  const [currentBehavior, setCurrentBehavior] = useState<NewBehavior>({ id: Date.now().toString(), name: '' });
  const [isEditingBehavior, setIsEditingBehavior] = useState<string | null>(null);
  const [createdBehaviorIds, setCreatedBehaviorIds] = useState<string[]>([]);
  const [behaviorIdMapping, setBehaviorIdMapping] = useState<Record<string, string>>({});

  // ImagePicker states
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [showThumbPicker, setShowThumbPicker] = useState(false);

  // Step 3 - Activity creation
  const [activities, setActivities] = useState<NewActivity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<NewActivity>({
    id: Date.now().toString(),
    name: '',
    money: 0,
    positive: true,
    repeat: 'none',
    behaviorId: undefined
  });
  const [isEditingActivity, setIsEditingActivity] = useState<string | null>(null);

  // UI states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const router = useRouter();

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Check if passwords match
    if (password !== retypePassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting registration with:', { username, email, parentCode });
      const response = await axios.post('/api/register', {
        username,
        email,
        password,
        parentCode,
      });
      console.log('Registration response:', response.data);

      // Get the registered userId from response or use username as fallback
      const userId = response.data.userId || username;
      setRegisteredUserId(userId);
      setSuccess('Account created successfully! Let\'s set up your first behavior.');
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBehavior = () => {
    if (!currentBehavior.name.trim()) {
      setError('Please enter a behavior name');
      return;
    }

    if (isEditingBehavior) {
      // Update existing behavior
      setBehaviors(prev => prev.map(b =>
        b.id === isEditingBehavior ? currentBehavior : b
      ));
      setIsEditingBehavior(null);
    } else {
      // Add new behavior
      setBehaviors(prev => [...prev, currentBehavior]);
    }

    // Reset form
    setCurrentBehavior({ id: Date.now().toString(), name: '' });
    setError('');
  };

  const handleEditBehavior = (behavior: NewBehavior) => {
    setCurrentBehavior(behavior);
    setIsEditingBehavior(behavior.id);
  };

  const handleDeleteBehavior = (id: string) => {
    setBehaviors(prev => prev.filter(b => b.id !== id));
    if (isEditingBehavior === id) {
      setCurrentBehavior({ id: Date.now().toString(), name: '' });
      setIsEditingBehavior(null);
    }
  };

  const handleStep2Submit = async () => {
    if (behaviors.length === 0) {
      setError('Please add at least one behavior');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const createdIds: string[] = [];
      const idMapping: Record<string, string> = {};

      // Create all behaviors
      for (const behavior of behaviors) {
        console.log('Creating behavior:', { userId: registeredUserId, behaviorName: behavior.name });
        await axios.post('/api/behaviors', {
          userId: registeredUserId,
          behaviorName: behavior.name,
          bannerImage: behavior.bannerImage,
          thumbImage: behavior.thumbImage,
        });

        // Get the behavior ID from DynamoDB scan
        const behaviorsResponse = await axios.get(`/api/behaviors?userId=${encodeURIComponent(registeredUserId)}`);
        const createdBehavior = behaviorsResponse.data.find((b: any) => b.behaviorName === behavior.name);
        if (createdBehavior) {
          createdIds.push(createdBehavior.behaviorId);
          idMapping[behavior.id] = createdBehavior.behaviorId;
        }
      }

      setCreatedBehaviorIds(createdIds);
      setBehaviorIdMapping(idMapping);
      setSuccess(`${behaviors.length} behavior(s) created! Now let's add activities.`);
      setCurrentStep(3);
    } catch (err: any) {
      console.error('Behavior creation error:', err);
      setError(err.response?.data?.error || 'Failed to create behaviors');
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = () => {
    if (!currentActivity.name.trim()) {
      setError('Please enter an activity name');
      return;
    }

    if (isEditingActivity) {
      // Update existing activity
      setActivities(prev => prev.map(a =>
        a.id === isEditingActivity ? currentActivity : a
      ));
      setIsEditingActivity(null);
    } else {
      // Add new activity
      setActivities(prev => [...prev, currentActivity]);
    }

    // Reset form
    setCurrentActivity({
      id: Date.now().toString(),
      name: '',
      money: 0,
      positive: true,
      repeat: 'none',
      behaviorId: undefined
    });
    setError('');
  };

  const handleEditActivity = (activity: NewActivity) => {
    setCurrentActivity(activity);
    setIsEditingActivity(activity.id);
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    if (isEditingActivity === id) {
      setCurrentActivity({
        id: Date.now().toString(),
        name: '',
        money: 0,
        positive: true,
        repeat: 'none',
        behaviorId: undefined
      });
      setIsEditingActivity(null);
    }
  };

  const handleStep3Submit = async () => {
    if (activities.length === 0) {
      setError('Please add at least one activity');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create all activities
      for (const activity of activities) {
        console.log('Creating activity:', {
          behaviorId: activity.behaviorId,
          activityName: activity.name,
          money: activity.money,
          positive: activity.positive,
          userId: registeredUserId
        });

        // Map the temporary behavior ID to the actual DynamoDB behavior ID
        const actualBehaviorId = activity.behaviorId ? behaviorIdMapping[activity.behaviorId] : undefined;

        await axios.post('/api/activities', {
          behaviorId: actualBehaviorId,
          activityName: activity.name,
          money: activity.money,
          positive: activity.positive,
          repeat: activity.repeat,
          userId: registeredUserId,
        });
      }

      setSuccess('Setup complete! Redirecting to login...');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Activity creation error:', err);
      setError(err.response?.data?.error || 'Failed to create activities');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipToLogin = () => {
    setSuccess('Setup skipped. Redirecting to login...');
    setTimeout(() => {
      router.push('/login');
    }, 1000);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setError('');
      setSuccess('');
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
      setSuccess('');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-colour-2 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                placeholder="Choose a fun username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-colour-2 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                placeholder="Enter your email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-colour-2 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                placeholder="Create a secure password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-colour-2 mb-2">Retype Password</label>
              <input
                type="password"
                value={retypePassword}
                onChange={(e) => setRetypePassword(e.target.value)}
                className={`w-full p-4 border-2 rounded-xl focus:outline-none transition duration-300 ${
                  retypePassword && password !== retypePassword
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-colour-2'
                }`}
                placeholder="Retype your password"
                required
              />
              {retypePassword && password !== retypePassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-colour-2 mb-2">Parent Code</label>
              <input
                type="text"
                value={parentCode}
                onChange={(e) => setParentCode(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                placeholder="Enter your parent code"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Ask your parent for the special code</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-2 w-full py-4 rounded-xl text-lg font-bold transition duration-300 disabled:opacity-50"
            >
              {loading ? '🔄 Creating Account...' : '✨ Create My Account'}
            </button>
          </form>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Add Behavior Form */}
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-100">
              <h3 className="text-lg font-semibold text-colour-2 mb-4">
                {isEditingBehavior ? 'Edit Behavior' : 'Add New Behavior'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-colour-2 mb-2">Behavior Name</label>
                  <input
                    type="text"
                    value={currentBehavior.name}
                    onChange={(e) => setCurrentBehavior({ ...currentBehavior, name: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                    placeholder="e.g., Being Kind, Doing Chores, Homework"
                  />
                </div>

                {/* Image Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-colour-2 mb-2">Banner Image</label>
                    <div className="flex items-center gap-2">
                      {currentBehavior.bannerImage && (
                        <img
                          src={currentBehavior.bannerImage}
                          alt="Banner"
                          className="w-12 h-8 object-cover rounded border"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setShowBannerPicker(true)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                      >
                        {currentBehavior.bannerImage ? 'Change' : 'Select'} Banner
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-colour-2 mb-2">Thumb Image</label>
                    <div className="flex items-center gap-2">
                      {currentBehavior.thumbImage && (
                        <img
                          src={currentBehavior.thumbImage}
                          alt="Thumb"
                          className="w-8 h-8 object-cover rounded border"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setShowThumbPicker(true)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                      >
                        {currentBehavior.thumbImage ? 'Change' : 'Select'} Thumb
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddBehavior}
                  className="w-full py-3 bg-colour-2 text-white rounded-xl font-semibold hover:bg-colour-1 transition duration-300"
                >
                  {isEditingBehavior ? 'Update Behavior' : 'Add Behavior'}
                </button>

                {isEditingBehavior && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingBehavior(null);
                      setCurrentBehavior({ id: Date.now().toString(), name: '' });
                    }}
                    className="w-full py-2 text-gray-600 hover:text-gray-800 transition duration-300"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Behaviors List */}
            {behaviors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-colour-2 mb-3">Your Behaviors ({behaviors.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {behaviors.map((behavior) => (
                    <div key={behavior.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        {behavior.thumbImage && (
                          <img src={behavior.thumbImage} alt="Thumb" className="w-8 h-8 object-cover rounded" />
                        )}
                        <span className="font-medium">{behavior.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditBehavior(behavior)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBehavior(behavior.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSkipToLogin}
                className="btn-3 flex-1 py-4 rounded-xl text-lg font-bold transition duration-300"
              >
                Skip & Finish
              </button>
              <button
                type="button"
                onClick={handleStep2Submit}
                disabled={loading || behaviors.length === 0}
                className="btn-2 flex-1 py-4 rounded-xl text-lg font-bold transition duration-300 disabled:opacity-50"
              >
                {loading ? '🔄 Creating...' : `Continue with ${behaviors.length} Behavior${behaviors.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Add Activity Form */}
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-100">
              <h3 className="text-lg font-semibold text-colour-2 mb-4">
                {isEditingActivity ? 'Edit Activity' : 'Add New Activity'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-colour-2 mb-2">Activity Name</label>
                  <input
                    type="text"
                    value={currentActivity.name}
                    onChange={(e) => setCurrentActivity({ ...currentActivity, name: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                    placeholder="e.g., Say please and thank you, Make bed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-colour-2 mb-2">Assign to Behavior</label>
                  <select
                    value={currentActivity.behaviorId || ''}
                    onChange={(e) => setCurrentActivity({ ...currentActivity, behaviorId: e.target.value || undefined })}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                  >
                    <option value="">Standalone Activity (No Behavior)</option>
                    {behaviors.map((behavior) => (
                      <option key={behavior.id} value={behavior.id}>
                        {behavior.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choose a behavior or leave standalone</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-colour-2 mb-2">Reward Amount</label>
                    <input
                      type="number"
                      value={currentActivity.money}
                      onChange={(e) => setCurrentActivity({ ...currentActivity, money: Number(e.target.value) })}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                      placeholder="5"
                      min="0"
                      step="0.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Coins earned/lost</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-colour-2 mb-2">Frequency</label>
                    <select
                      value={currentActivity.repeat}
                      onChange={(e) => setCurrentActivity({ ...currentActivity, repeat: e.target.value as any })}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-colour-2 focus:outline-none transition duration-300"
                    >
                      <option value="none">No repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="once">Just once</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-colour-2 mb-2">Activity Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="positive"
                        checked={currentActivity.positive === true}
                        onChange={() => setCurrentActivity({ ...currentActivity, positive: true })}
                        className="mr-2"
                      />
                      <span className="text-green-600">🎉 Good behavior (earn coins)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="positive"
                        checked={currentActivity.positive === false}
                        onChange={() => setCurrentActivity({ ...currentActivity, positive: false })}
                        className="mr-2"
                      />
                      <span className="text-red-600">❌ Bad behavior (lose coins)</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddActivity}
                  className="w-full py-3 bg-colour-2 text-white rounded-xl font-semibold hover:bg-colour-1 transition duration-300"
                >
                  {isEditingActivity ? 'Update Activity' : 'Add Activity'}
                </button>

                {isEditingActivity && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingActivity(null);
                      setCurrentActivity({
                        id: Date.now().toString(),
                        name: '',
                        money: 0,
                        positive: true,
                        repeat: 'none',
                        behaviorId: undefined
                      });
                    }}
                    className="w-full py-2 text-gray-600 hover:text-gray-800 transition duration-300"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Activities List */}
            {activities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-colour-2 mb-3">Your Activities ({activities.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activities.map((activity) => {
                    const behaviorName = activity.behaviorId
                      ? behaviors.find(b => b.id === activity.behaviorId)?.name || 'Unknown Behavior'
                      : 'Standalone';

                    return (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{activity.name}</span>
                            <span className={`text-sm px-2 py-1 rounded-full ${
                              activity.positive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {activity.positive ? '+' : '-'}${activity.money}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {behaviorName} • {activity.repeat} • {activity.positive ? 'Earn' : 'Lose'} coins
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditActivity(activity)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSkipToLogin}
                className="btn-3 flex-1 py-4 rounded-xl text-lg font-bold transition duration-300"
              >
                Skip & Finish
              </button>
              <button
                type="button"
                onClick={handleStep3Submit}
                disabled={loading || activities.length === 0}
                className="btn-2 flex-1 py-4 rounded-xl text-lg font-bold transition duration-300 disabled:opacity-50"
              >
                {loading ? '🔄 Creating...' : `Complete Setup (${activities.length} Activit${activities.length !== 1 ? 'ies' : 'y'})`}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Create Your Account';
      case 2: return 'Add Your First Behavior';
      case 3: return 'Create an Activity';
      default: return 'Registration';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Join Better Kid and start your journey!';
      case 2: return 'What good behavior do you want to track?';
      case 3: return 'Add specific activities for this behavior';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen main-bg flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <img src="/betterlogo.png?v=1" alt="Better Kid Logo" className="w-32 mx-auto" />
          </Link>
          <h1 className="text-3xl font-bold text-colour-2 mb-2">{getStepTitle()}</h1>
          <p className="text-gray-600">{getStepDescription()}</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Step {currentStep} of 3</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-colour-2 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-colour-1 p-8">
          {renderStepContent()}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mt-4">
              <p className="text-red-600 text-sm font-medium">🚫 {error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mt-4">
              <p className="text-green-600 text-sm font-medium">🎉 {success}</p>
            </div>
          )}

          {/* Navigation - only show for steps 2 and 3 */}
          {currentStep > 1 && (
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={handlePrev}
                className="text-colour-2 hover:text-colour-1 font-medium transition duration-300"
              >
                ← Back
              </button>
              {currentStep < 3 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="text-colour-2 hover:text-colour-1 font-medium transition duration-300"
                >
                  Next →
                </button>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="btn-3 py-2 px-4 rounded-full font-semibold transition duration-300 inline-block">
                  Login here
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-colour-2 hover:text-colour-1 font-medium transition duration-300">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Image Pickers */}
      <ImagePicker
        folder="banner"
        selectedImage={currentBehavior.bannerImage || null}
        onSelect={(image) => setCurrentBehavior({ ...currentBehavior, bannerImage: image || undefined })}
        isOpen={showBannerPicker}
        onClose={() => setShowBannerPicker(false)}
      />

      <ImagePicker
        folder="thumb"
        selectedImage={currentBehavior.thumbImage || null}
        onSelect={(image) => setCurrentBehavior({ ...currentBehavior, thumbImage: image || undefined })}
        isOpen={showThumbPicker}
        onClose={() => setShowThumbPicker(false)}
      />
    </div>
  );
}
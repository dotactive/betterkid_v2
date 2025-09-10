'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

interface UserSettings {
  username: string;
  password: string;
  parentCode: string;
  completeAward: number;
  uncompleteFine: number;
  autoReset: boolean;
}

export default function SettingsPage() {
  const { isAuthenticated, userId } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    username: '',
    password: '',
    parentCode: '',
    completeAward: 1.0,
    uncompleteFine: 0.5,
    autoReset: false,
  });
  const [originalSettings, setOriginalSettings] = useState<UserSettings>({
    username: '',
    password: '',
    parentCode: '',
    completeAward: 1.0,
    uncompleteFine: 0.5,
    autoReset: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchSettings();
    }
  }, [isAuthenticated, userId]);

  const fetchSettings = async () => {
    if (!userId) return;
    
    try {
      const response = await axios.get(`/api/users/${userId}/settings`);
      const userSettings = response.data;
      
      const settingsData = {
        username: userSettings.username || '',
        password: '', // Never pre-fill password for security
        parentCode: userSettings.parentCode || '',
        completeAward: userSettings.completeAward || 1.0,
        uncompleteFine: userSettings.uncompleteFine || 0.5,
        autoReset: userSettings.autoReset || false,
      };
      
      setSettings(settingsData);
      setOriginalSettings(settingsData);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to load settings');
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Only send changed fields to avoid unnecessary updates
      const changedFields: any = {};
      
      Object.keys(settings).forEach(key => {
        const field = key as keyof UserSettings;
        if (field === 'password') {
          // Only include password if it's not empty
          if (settings[field].trim() !== '') {
            changedFields[field] = settings[field];
          }
        } else if (settings[field] !== originalSettings[field]) {
          changedFields[field] = settings[field];
        }
      });
      
      if (Object.keys(changedFields).length === 0 && settings.password.trim() === '') {
        setError('No changes to save');
        setSaving(false);
        return;
      }
      
      const response = await axios.put(`/api/users/${userId}/settings`, changedFields);
      
      setSuccess('Settings saved successfully!');
      setOriginalSettings(settings);
      
      // Clear password field after successful save
      setSettings(prev => ({ ...prev, password: '' }));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.error || 'Failed to save settings');
    }
    
    setSaving(false);
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setError('');
    setSuccess('');
  };

  if (isAuthenticated === null || loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings) || settings.password.trim() !== '';

  return (

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Account Settings */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Account Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={settings.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={settings.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password (leave empty to keep current)"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to keep your current password</p>
              </div>

              <div>
                <label htmlFor="parentCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Code
                </label>
                <input
                  id="parentCode"
                  type="text"
                  value={settings.parentCode}
                  onChange={(e) => handleInputChange('parentCode', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter parent access code"
                />
                <p className="text-xs text-gray-500 mt-1">Required for accessing edit mode and parent features</p>
              </div>
            </div>
          </div>

          {/* Todo System Settings */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Todo System Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Reset Time
                </label>
                <div className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
                  10:00 PM (22:00)
                </div>
                <p className="text-xs text-gray-500 mt-1">Daily todos reset at 10:00 PM for all users</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="completeAward" className="block text-sm font-medium text-gray-700 mb-1">
                    Complete Award ($)
                  </label>
                  <input
                    id="completeAward"
                    type="number"
                    step="0.1"
                    min="0"
                    value={settings.completeAward}
                    onChange={(e) => handleInputChange('completeAward', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Reward for completing todos (set to 0 to disable)</p>
                </div>

                <div>
                  <label htmlFor="uncompleteFine" className="block text-sm font-medium text-gray-700 mb-1">
                    Incomplete Fine ($)
                  </label>
                  <input
                    id="uncompleteFine"
                    type="number"
                    step="0.1"
                    min="0"
                    value={settings.uncompleteFine}
                    onChange={(e) => handleInputChange('uncompleteFine', parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Penalty for each uncompleted daily todo (set to 0 to disable)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto Reset
                </label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoReset}
                      onChange={(e) => handleInputChange('autoReset', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm text-gray-700">{settings.autoReset ? 'Enabled' : 'Disabled'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">When enabled, daily reset will automatically run at 10:00 PM to approve pending activities and reset daily todos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
              hasChanges && !saving
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? '💾 Saving...' : '💾 Save Changes'}
          </button>
          
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className={`flex-1 py-3 px-6 rounded-lg font-medium border transition-colors ${
              hasChanges && !saving
                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            🔄 Reset Changes
          </button>
        </div>
      </div>

  );
}
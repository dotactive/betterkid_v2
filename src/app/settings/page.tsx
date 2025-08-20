'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

interface UserSettings {
  username: string;
  password: string;
  parentCode: string;
  resetTime: string;
  completeAward: number;
  uncompleteFine: number;
  completeAwardEnabled: boolean;
  uncompleteFineEnabled: boolean;
}

export default function SettingsPage() {
  const { isAuthenticated, userId } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    username: '',
    password: '',
    parentCode: '',
    resetTime: '21:10',
    completeAward: 1.0,
    uncompleteFine: 0.5,
    completeAwardEnabled: false,
    uncompleteFineEnabled: false,
  });
  const [originalSettings, setOriginalSettings] = useState<UserSettings>({
    username: '',
    password: '',
    parentCode: '',
    resetTime: '21:10',
    completeAward: 1.0,
    uncompleteFine: 0.5,
    completeAwardEnabled: false,
    uncompleteFineEnabled: false,
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
        resetTime: userSettings.resetTime || '21:10',
        completeAward: userSettings.completeAward || 1.0,
        uncompleteFine: userSettings.uncompleteFine || 0.5,
        completeAwardEnabled: userSettings.completeAwardEnabled || false,
        uncompleteFineEnabled: userSettings.uncompleteFineEnabled || false,
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
    <main className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Settings</h1>
        
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

        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">👤 Account Settings</h2>
            
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
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Todo System Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="resetTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Reset Time
                </label>
                <input
                  id="resetTime"
                  type="time"
                  value={settings.resetTime}
                  onChange={(e) => handleInputChange('resetTime', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">When daily todos reset each day</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center mb-3">
                    <input
                      id="completeAwardEnabled"
                      type="checkbox"
                      checked={settings.completeAwardEnabled}
                      onChange={(e) => handleInputChange('completeAwardEnabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-2"
                    />
                    <label htmlFor="completeAwardEnabled" className="text-sm font-medium text-gray-700">
                      Enable Complete Award
                    </label>
                  </div>
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
                    disabled={!settings.completeAwardEnabled}
                    className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !settings.completeAwardEnabled ? 'bg-gray-100 text-gray-500' : ''
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Default reward for completing todos</p>
                </div>

                <div>
                  <div className="flex items-center mb-3">
                    <input
                      id="uncompleteFineEnabled"
                      type="checkbox"
                      checked={settings.uncompleteFineEnabled}
                      onChange={(e) => handleInputChange('uncompleteFineEnabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-2"
                    />
                    <label htmlFor="uncompleteFineEnabled" className="text-sm font-medium text-gray-700">
                      Enable Incomplete Fine
                    </label>
                  </div>
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
                    disabled={!settings.uncompleteFineEnabled}
                    className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !settings.uncompleteFineEnabled ? 'bg-gray-100 text-gray-500' : ''
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Penalty for each uncompleted daily todo</p>
                </div>
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
    </main>
  );
}
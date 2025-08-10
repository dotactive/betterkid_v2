'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useEditMode } from '@/hooks/useEditMode';
import ImagePicker from '@/components/ImagePicker';

interface Behavior {
  behaviorId: string;
  behaviorName: string;
  bannerImage?: string | null;
  thumbImage?: string | null;
}

export default function UserPage() {
  const { isAuthenticated, userId } = useAuth();
  const { editMode } = useEditMode();
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [error, setError] = useState('');
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [editingBehaviorId, setEditingBehaviorId] = useState<string | null>(null);
  const [editingBehaviorName, setEditingBehaviorName] = useState('');
  const [editingThumbImage, setEditingThumbImage] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerBehaviorId, setImagePickerBehaviorId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('Fetching behaviors for user:', userId);
      fetchBehaviors();
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!editMode) {
      setShowAddBehavior(false);
      setEditingBehaviorId(null);
    }
  }, [editMode]);

  const fetchBehaviors = async () => {
    if (!userId) return;
    try {
      const response = await axios.get(`/api/behaviors?userId=${encodeURIComponent(userId)}`);
      console.log(`Fetched behaviors for ${userId}:`, response.data);
      const fetchedBehaviors = response.data || [];
      const validBehaviors = fetchedBehaviors.filter((behavior: Behavior) => {
        if (!behavior.behaviorId || !behavior.behaviorName) {
          console.warn('Invalid behavior:', behavior);
          return false;
        }
        return true;
      });
      setBehaviors(validBehaviors);
    } catch (err: any) {
      console.error('Failed to fetch behaviors:', err);
      setError(err.response?.data?.error || 'Failed to fetch behaviors');
    }
  };

  const handleAddBehavior = async () => {
    if (!userId || !newBehaviorName.trim()) {
      setError('Behavior name is required');
      return;
    }
    
    try {
      await axios.post('/api/behaviors', {
        userId,
        behaviorName: newBehaviorName.trim(),
      });
      setNewBehaviorName('');
      setShowAddBehavior(false);
      fetchBehaviors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add behavior');
    }
  };

  const handleDeleteBehavior = async (behaviorId: string) => {
    if (!userId || !confirm('Are you sure you want to delete this behavior and all its activities?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/behaviors/${behaviorId}`, {
        headers: { 'x-userid': userId }
      });
      fetchBehaviors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete behavior');
    }
  };

  const handleEditBehavior = (behavior: Behavior) => {
    setEditingBehaviorId(behavior.behaviorId);
    setEditingBehaviorName(behavior.behaviorName);
  };

  const handleImageClick = (behavior: Behavior) => {
    setImagePickerBehaviorId(behavior.behaviorId);
    setEditingThumbImage(behavior.thumbImage || null);
    setShowImagePicker(true);
  };

  const handleImageSelect = async (selectedImage: string | null) => {
    if (!userId || !imagePickerBehaviorId) return;
    
    try {
      await axios.put(`/api/behaviors/${imagePickerBehaviorId}`, {
        userId,
        behaviorName: behaviors.find(b => b.behaviorId === imagePickerBehaviorId)?.behaviorName,
        thumbImage: selectedImage,
      });
      setShowImagePicker(false);
      setImagePickerBehaviorId(null);
      setEditingThumbImage(null);
      fetchBehaviors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update thumbnail');
    }
  };

  const handleSaveBehavior = async (behaviorId: string) => {
    if (!userId || !editingBehaviorName.trim()) {
      setError('Behavior name is required');
      return;
    }
    
    try {
      await axios.put(`/api/behaviors/${behaviorId}`, {
        userId,
        behaviorName: editingBehaviorName.trim(),
      });
      setEditingBehaviorId(null);
      setEditingBehaviorName('');
      fetchBehaviors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update behavior');
    }
  };

  const handleCancelEdit = () => {
    setEditingBehaviorId(null);
    setEditingBehaviorName('');
  };

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }

  return (
    <main>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      
      {behaviors.length === 0 && !editMode ? (
        <p className="text-gray-600">No behaviors found. Add some in the Content Editor!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ">
          {behaviors.map((behavior) => (
            <div key={behavior.behaviorId} className="relative">
              {editMode ? (
                <div className="bg-white rounded-lg shadow p-4 border-2 border-dashed border-gray-300">
                  <div 
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick(behavior)}
                    title="Click to change thumbnail"
                  >
                    {behavior.thumbImage ? (
                      <img
                        src={behavior.thumbImage}
                        alt={`${behavior.behaviorName} thumbnail`}
                        className="w-full object-cover rounded-md mb-2"
                      />
                    ) : (
                      <div className="w-full bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-500 h-32 border-2 border-dashed border-gray-400 hover:border-blue-400">
                        <div className="text-center">
                          <div>📷</div>
                          <div className="text-xs mt-1">Click to add thumbnail</div>
                        </div>
                      </div>
                    )}
                  </div>
                  {editingBehaviorId === behavior.behaviorId ? (
                    <div className="mb-3">
                      <input
                        type="text"
                        value={editingBehaviorName}
                        onChange={(e) => setEditingBehaviorName(e.target.value)}
                        className="w-full p-2 border rounded text-gray-900"
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveBehavior(behavior.behaviorId)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <h3 className="text-lg font-medium text-gray-900 truncate mb-3">{behavior.behaviorName}</h3>
                  )}
                  {editingBehaviorId === behavior.behaviorId ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveBehavior(behavior.behaviorId)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditBehavior(behavior)}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm"
                      >
                        Edit Name
                      </button>
                      <Link
                        href={`/behaviors/${behavior.behaviorId}`}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-center text-sm"
                      >
                        Edit Activities
                      </Link>
                      <button
                        onClick={() => handleDeleteBehavior(behavior.behaviorId)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={`/behaviors/${behavior.behaviorId}`}
                  className="block group"
                >
                  <div className="bg-white rounded-lg shadow p-4 hover:bg-yellow-100 cursor-pointer">
                    {behavior.thumbImage ? (
                      <img
                        src={behavior.thumbImage}
                        alt={`${behavior.behaviorName} thumbnail`}
                        className="w-full object-cover rounded-md mb-2 group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-full bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-500 h-32">
                        No Thumbnail
                      </div>
                    )}
                    <h3 className="text-lg font-medium text-gray-900 truncate">{behavior.behaviorName}</h3>
                  </div>
                </Link>
              )}
            </div>
          ))}
          
          {/* Add Behavior Box - appears in grid when in edit mode */}
          {editMode && (
            <div className="relative">
              <div 
                className="bg-white rounded-lg shadow p-4 border-2 border-dashed border-green-400 hover:border-green-500 cursor-pointer transition-colors"
                onClick={() => setShowAddBehavior(!showAddBehavior)}
              >
                {showAddBehavior ? (
                  <div className="h-full flex flex-col">
                    <div className="w-full bg-green-50 rounded-md mb-2 flex items-center justify-center text-green-600 h-32 border-2 border-dashed border-green-400">
                      <div className="text-center">
                        <div className="text-4xl">➕</div>
                        <div className="text-xs mt-1">Add Behavior</div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <input
                        type="text"
                        value={newBehaviorName}
                        onChange={(e) => setNewBehaviorName(e.target.value)}
                        placeholder="Behavior name"
                        className="w-full p-2 border rounded text-gray-900"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddBehavior()}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddBehavior();
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddBehavior(false);
                          setNewBehaviorName('');
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-center">
                    <div className="w-full bg-green-50 rounded-md mb-2 flex items-center justify-center text-green-600 h-32 border-2 border-dashed border-green-400">
                      <div className="text-center">
                        <div className="text-4xl">➕</div>
                        <div className="text-xs mt-1">Add Behavior</div>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-green-600 text-center">Add New Behavior</h3>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Picker Modal */}
      <ImagePicker
        folder="thumb"
        selectedImage={editingThumbImage}
        onSelect={handleImageSelect}
        isOpen={showImagePicker}
        onClose={() => {
          setShowImagePicker(false);
          setImagePickerBehaviorId(null);
          setEditingThumbImage(null);
        }}
      />
    </main>
  );
}


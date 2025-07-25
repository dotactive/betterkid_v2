'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Behavior {
  behaviorId: string;
  behaviorName: string;
  bannerImage?: string | null;
  thumbImage?: string | null;
}

export default function UserPage() {
  const { isAuthenticated, username } = useAuth();
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && username) {
      console.log('Fetching behaviors for user:', username);
      const fetchBehaviors = async () => {
        try {
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
        } catch (err: any) {
          console.error('Failed to fetch behaviors:', err);
          setError(err.response?.data?.error || 'Failed to fetch behaviors');
        }
      };
      fetchBehaviors();
    }
  }, [isAuthenticated, username]);

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }

  return (

        <main className="px-6 py-8">


      {error && <p className="text-red-600 mb-4">{error}</p>}
      {behaviors.length === 0 ? (
        <p className="text-gray-600">No behaviors found. Add some in the Content Editor!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {behaviors.map((behavior) => (
            <Link
              key={behavior.behaviorId}
              href={`/${username}/front/behaviors/${behavior.behaviorId}`}
              className="block group"
            >
              <div className="bg-white rounded-lg shadow p-4 hover:bg-yellow-100 cursor-pointer">
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
            </Link>
          ))}
        </div>
      )}
  
      </main>
  );
}


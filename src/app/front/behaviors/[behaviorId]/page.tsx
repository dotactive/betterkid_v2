'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

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
  const { behaviorId } = useParams() as { behaviorId: string };
  const [behavior, setBehavior] = useState<Behavior | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && userId && behaviorId) {
      console.log(`Fetching data for behavior: ${behaviorId}`);
      fetchBehavior();
      fetchActivities();
    }
  }, [isAuthenticated, userId, behaviorId]);

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-8 text-center">{behavior.behaviorName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto  text-black">
        {/* Positive Activities */}
        <section className="bg-green-50 rounded-2xl shadow p-6 border border-green-200 min-h-[300px] flex flex-col">
          <h2 className="text-xl font-semibold text-green-700 mb-4 text-center">Positive Activities</h2>
          {positiveActivities.length === 0 ? (
            <p className="text-gray-500 text-center">No positive activities found.</p>
          ) : (
            <ul className="flex-1  pl-6">
              {positiveActivities.map((activity) => (
                <li key={activity.activityId} className="mb-2">
                  <span className="font-medium">{activity.activityName}</span> — ${activity.money.toFixed(2)}
                </li>
              ))}
            </ul>
          )}
        </section>
        {/* Negative Activities */}
        <section className="bg-red-50 rounded-2xl shadow p-6 border border-red-200 min-h-[300px] flex flex-col">
          <h2 className="text-xl font-semibold text-red-700 mb-4 text-center">Negative Activities</h2>
          {negativeActivities.length === 0 ? (
            <p className="text-gray-500 text-center">No negative activities found.</p>
          ) : (
            <ul className="flex-1  pl-6">
              {negativeActivities.map((activity) => (
                <li key={activity.activityId} className="mb-2">
                  <span className="font-medium">{activity.activityName}</span> — ${activity.money.toFixed(2)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

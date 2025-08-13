'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faMinus, 
  faCoins,
  faFilter,
  faSearch,
  faSort,
  faThumbtack
} from '@fortawesome/free-solid-svg-icons';

interface Activity {
  activityId: string;
  activityName: string;
  money: number;
  positive: boolean;
  top?: boolean;
  behaviorId?: string;
  behaviorName?: string;
}

interface Behavior {
  behaviorId: string;
  behaviorName: string;
}

export default function ActivitiesPage() {
  const { isAuthenticated, userId } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'money' | 'behavior'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchBehaviors();
    }
  }, [isAuthenticated, userId]);

  const fetchBehaviors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/behaviors?userId=${encodeURIComponent(userId!)}`);
      const behaviorsData: Behavior[] = response.data || [];
      setBehaviors(behaviorsData);
      
      // Fetch activities for each behavior
      await fetchAllActivities(behaviorsData);
    } catch (err: any) {
      console.error('Failed to fetch behaviors:', err);
      setError(err.response?.data?.error || 'Failed to fetch behaviors');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllActivities = async (behaviorsData: Behavior[]) => {
    try {
      const allActivities: Activity[] = [];
      
      for (const behavior of behaviorsData) {
        try {
          const response = await axios.get(`/api/activities?behaviorId=${encodeURIComponent(behavior.behaviorId)}`);
          const behaviorActivities = response.data || [];
          
          // Add behavior info to each activity
          const activitiesWithBehavior = behaviorActivities.map((activity: Activity) => ({
            ...activity,
            behaviorId: behavior.behaviorId,
            behaviorName: behavior.behaviorName,
          }));
          
          allActivities.push(...activitiesWithBehavior);
        } catch (err) {
          console.error(`Failed to fetch activities for behavior ${behavior.behaviorId}:`, err);
        }
      }
      
      setActivities(allActivities);
    } catch (err: any) {
      console.error('Failed to fetch activities:', err);
      setError('Failed to fetch activities');
    }
  };

  // Filter and sort activities
  const filteredAndSortedActivities = activities
    .filter(activity => {
      // Search filter
      const matchesSearch = activity.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (activity.behaviorName && activity.behaviorName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Type filter
      const matchesType = filterType === 'all' || 
                         (filterType === 'positive' && activity.positive) ||
                         (filterType === 'negative' && !activity.positive);
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      // First sort by 'top' status
      if (a.top && !b.top) return -1;
      if (!a.top && b.top) return 1;
      
      // Then sort by selected criteria
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.activityName.localeCompare(b.activityName);
          break;
        case 'money':
          comparison = a.money - b.money;
          break;
        case 'behavior':
          comparison = (a.behaviorName || '').localeCompare(b.behaviorName || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (isAuthenticated === null || loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Activities</h1>
        <p className="text-gray-600">View and manage all your activities across different behaviors</p>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities or behaviors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'positive' | 'negative')}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="positive">Positive Only</option>
              <option value="negative">Negative Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <FontAwesomeIcon icon={faSort} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'money' | 'behavior')}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="name">Sort by Name</option>
              <option value="money">Sort by Amount</option>
              <option value="behavior">Sort by Behavior</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faPlus} className="text-green-500 text-2xl mr-3" />
            <div>
              <p className="text-sm text-green-600 font-medium">Positive Activities</p>
              <p className="text-2xl font-bold text-green-800">
                {activities.filter(a => a.positive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faMinus} className="text-red-500 text-2xl mr-3" />
            <div>
              <p className="text-sm text-red-600 font-medium">Negative Activities</p>
              <p className="text-2xl font-bold text-red-800">
                {activities.filter(a => !a.positive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCoins} className="text-blue-500 text-2xl mr-3" />
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Activities</p>
              <p className="text-2xl font-bold text-blue-800">{activities.length}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Activities List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Activities ({filteredAndSortedActivities.length})
          </h2>
        </div>

        {filteredAndSortedActivities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FontAwesomeIcon icon={faSearch} className="text-4xl mb-4" />
            <p>No activities found matching your criteria.</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAndSortedActivities.map((activity) => (
              <div key={activity.activityId} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Activity Type Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.positive 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`}>
                      <FontAwesomeIcon 
                        icon={activity.positive ? faPlus : faMinus} 
                        className="text-white text-lg" 
                      />
                    </div>

                    {/* Activity Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {activity.activityName}
                        </h3>
                        {activity.top && (
                          <FontAwesomeIcon 
                            icon={faThumbtack} 
                            className="text-blue-500 text-sm" 
                            title="Pinned to top"
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        Behavior: {activity.behaviorName || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center space-x-2">
                    <span className={`text-xl font-bold ${
                      activity.positive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {activity.positive ? '+' : '-'}${Math.abs(activity.money).toFixed(2)}
                    </span>
                    <FontAwesomeIcon 
                      icon={faCoins} 
                      className={`text-sm ${
                        activity.positive ? 'text-green-500' : 'text-red-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
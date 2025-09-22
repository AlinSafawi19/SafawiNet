'use client';

import React from 'react';
import { useOptimizedFetch } from '../../hooks/useOptimizedFetch';
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { OptimizedLoadingWrapper } from '../OptimizedLoadingWrapper';
import { SkeletonLoader, SmallLoadingSpinner } from '../SuspenseWrapper';

// Example component demonstrating all optimizations
export const OptimizedExample: React.FC = () => {
  const { trackApiCall, getPerformanceScore } = usePerformanceMonitor();

  // Optimized data fetching with caching
  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useOptimizedFetch(
    '/api/users',
    { method: 'GET' },
    {
      cacheTime: 60000, // 1 minute cache
      retry: 3,
      staleTime: 30000, // 30 seconds stale time
    }
  );

  // Optimistic updates for user data
  const {
    data: currentUser,
    updateOptimistically,
    isUpdating,
  } = useOptimisticUpdate(
    { name: '', email: '' },
    {
      onSuccess: (data) => console.log('Update successful:', data),
      onError: (error) => console.error('Update failed:', error),
    }
  );

  const handleUserUpdate = async (newData: { name: string; email: string }) => {
    const startTime = performance.now();

    await updateOptimistically(
      (current) => ({ ...current, ...newData }),
      async () => {
        // Simulate API call
        const response = await fetch('/api/user', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newData),
        });

        trackApiCall('/api/user', startTime);
        return response.json();
      }
    );
  };

  const performanceScore = getPerformanceScore();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Optimized Frontend Example</h1>

      {/* Performance Score Display */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Performance Score</h2>
        <div className="flex items-center space-x-2">
          <div
            className={`w-4 h-4 rounded-full ${
              performanceScore >= 80
                ? 'bg-green-500'
                : performanceScore >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          />
          <span>{performanceScore}/100</span>
        </div>
      </div>

      {/* Optimized Data Fetching */}
      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Users List (Cached)</h2>

        <OptimizedLoadingWrapper showSkeleton={usersLoading} skeletonLines={3}>
          {usersLoading ? (
            <SkeletonLoader lines={3} />
          ) : usersError ? (
            <div className="text-red-500">Error: {usersError}</div>
          ) : (
            <div className="space-y-2">
              {users?.map((user: any) => (
                <div
                  key={user.id}
                  className="p-2 bg-gray-100 dark:bg-gray-600 rounded"
                >
                  {user.name} - {user.email}
                </div>
              ))}
              <button
                onClick={refetchUsers}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh Users
              </button>
            </div>
          )}
        </OptimizedLoadingWrapper>
      </div>

      {/* Optimistic Updates Example */}
      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Optimistic Updates</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={currentUser.name}
              onChange={(e) =>
                handleUserUpdate({ ...currentUser, name: e.target.value })
              }
              className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500"
              placeholder="Enter name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={currentUser.email}
              onChange={(e) =>
                handleUserUpdate({ ...currentUser, email: e.target.value })
              }
              className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500"
              placeholder="Enter email"
            />
          </div>

          {isUpdating && (
            <div className="flex items-center space-x-2 text-blue-500">
              <SmallLoadingSpinner size="sm" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading States Examples */}
      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Loading States</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Small Spinner</h3>
            <SmallLoadingSpinner size="sm" />
          </div>

          <div>
            <h3 className="font-medium mb-2">Medium Spinner</h3>
            <SmallLoadingSpinner size="md" />
          </div>

          <div>
            <h3 className="font-medium mb-2">Large Spinner</h3>
            <SmallLoadingSpinner size="lg" />
          </div>

          <div>
            <h3 className="font-medium mb-2">Skeleton Loader</h3>
            <SkeletonLoader lines={4} />
          </div>
        </div>
      </div>
    </div>
  );
};

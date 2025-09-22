'use client';

import { useState, useCallback, useRef } from 'react';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  rollbackOnError?: boolean;
  timeout?: number;
}

export function useOptimisticUpdate<T>(
  initialData: T,
  options: OptimisticUpdateOptions<T> = {}
) {
  const {
    onSuccess,
    onError,
    rollbackOnError = true,
    timeout = 10000,
  } = options;

  const [data, setData] = useState<T>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const originalDataRef = useRef<T>(initialData);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateOptimistically = useCallback(
    async (
      optimisticUpdate: (currentData: T) => T,
      actualUpdate: () => Promise<T>
    ) => {
      // Store original data for potential rollback
      originalDataRef.current = data;

      // Apply optimistic update immediately
      const optimisticData = optimisticUpdate(data);
      setData(optimisticData);
      setIsUpdating(true);
      setError(null);

      try {
        // Set up timeout
        updateTimeoutRef.current = setTimeout(() => {
          throw new Error('Update timeout');
        }, timeout);

        // Perform actual update
        const actualData = await actualUpdate();

        // Clear timeout
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }

        // Update with actual data
        setData(actualData);
        setIsUpdating(false);

        onSuccess?.(actualData);
      } catch (err) {
        // Clear timeout
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }

        const error = err instanceof Error ? err : new Error('Update failed');
        setError(error);
        setIsUpdating(false);

        // Rollback to original data if enabled
        if (rollbackOnError) {
          setData(originalDataRef.current);
        }

        onError?.(error);
      }
    },
    [data, onSuccess, onError, rollbackOnError, timeout]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setIsUpdating(false);
    setError(null);
    originalDataRef.current = initialData;
  }, [initialData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    isUpdating,
    error,
    updateOptimistically,
    reset,
    clearError,
  };
}

// Hook for optimistic list updates
export function useOptimisticList<T>(
  initialItems: T[],
  options: OptimisticUpdateOptions<T[]> = {}
) {
  const {
    onSuccess,
    onError,
    rollbackOnError = true,
    timeout = 10000,
  } = options;

  const [items, setItems] = useState<T[]>(initialItems);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const originalItemsRef = useRef<T[]>(initialItems);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addOptimistically = useCallback(
    async (newItem: T, actualAdd: () => Promise<T>) => {
      originalItemsRef.current = items;

      // Add item immediately
      setItems((prev) => [...prev, newItem]);
      setIsUpdating(true);
      setError(null);

      try {
        updateTimeoutRef.current = setTimeout(() => {
          throw new Error('Add timeout');
        }, timeout);

        const actualItem = await actualAdd();

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }

        // Replace optimistic item with actual item
        setItems((prev) =>
          prev.map((item) => (item === newItem ? actualItem : item))
        );
        setIsUpdating(false);

        onSuccess?.(items);
      } catch (err) {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }

        const error = err instanceof Error ? err : new Error('Add failed');
        setError(error);
        setIsUpdating(false);

        if (rollbackOnError) {
          setItems(originalItemsRef.current);
        }

        onError?.(error);
      }
    },
    [items, onSuccess, onError, rollbackOnError, timeout]
  );

  const removeOptimistically = useCallback(
    async (itemToRemove: T, actualRemove: () => Promise<void>) => {
      originalItemsRef.current = items;

      // Remove item immediately
      setItems((prev) => prev.filter((item) => item !== itemToRemove));
      setIsUpdating(true);
      setError(null);

      try {
        updateTimeoutRef.current = setTimeout(() => {
          throw new Error('Remove timeout');
        }, timeout);

        await actualRemove();

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }

        setIsUpdating(false);
        onSuccess?.(items);
      } catch (err) {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }

        const error = err instanceof Error ? err : new Error('Remove failed');
        setError(error);
        setIsUpdating(false);

        if (rollbackOnError) {
          setItems(originalItemsRef.current);
        }

        onError?.(error);
      }
    },
    [items, onSuccess, onError, rollbackOnError, timeout]
  );

  const updateOptimistically = useCallback(
    async (
      itemToUpdate: T,
      optimisticUpdate: (item: T) => T,
      actualUpdate: () => Promise<T>
    ) => {
      originalItemsRef.current = items;

      // Update item immediately
      setItems((prev) =>
        prev.map((item) =>
          item === itemToUpdate ? optimisticUpdate(item) : item
        )
      );
      setIsUpdating(true);
      setError(null);

      try {
        updateTimeoutRef.current = setTimeout(() => {
          throw new Error('Update timeout');
        }, timeout);

        const actualItem = await actualUpdate();

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }

        // Replace optimistic item with actual item
        setItems((prev) =>
          prev.map((item) => (item === itemToUpdate ? actualItem : item))
        );
        setIsUpdating(false);

        onSuccess?.(items);
      } catch (err) {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }

        const error = err instanceof Error ? err : new Error('Update failed');
        setError(error);
        setIsUpdating(false);

        if (rollbackOnError) {
          setItems(originalItemsRef.current);
        }

        onError?.(error);
      }
    },
    [items, onSuccess, onError, rollbackOnError, timeout]
  );

  const reset = useCallback(() => {
    setItems(initialItems);
    setIsUpdating(false);
    setError(null);
    originalItemsRef.current = initialItems;
  }, [initialItems]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    items,
    isUpdating,
    error,
    addOptimistically,
    removeOptimistically,
    updateOptimistically,
    reset,
    clearError,
  };
}

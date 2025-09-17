import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { buildApiUrl, API_CONFIG } from '../config/api';

// Global state to prevent multiple API calls across different hook instances
let globalLoyaltyState = {
  data: null as LoyaltyAccount | null,
  isLoading: false,
  error: null as string | null,
  lastFetchUserId: null as string | null,
  isFetching: false,
};

// Global state manager to prevent conflicts between multiple hook instances
let globalStateManager = {
  activeInstances: new Set<string>(),
  primaryInstance: null as string | null,
  stateUpdateCallbacks: new Map<string, (state: any) => void>(),
};

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  benefits: any;
  color: string | null;
  icon: string | null;
}

export interface LoyaltyAccount {
  id: string;
  currentTier: LoyaltyTier;
  currentPoints: number;
  lifetimePoints: number;
  tierUpgradedAt: string | null;
  nextTier?: {
    name: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
}

export interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string;
  metadata: any;
  orderId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PaginatedTransactions {
  transactions: LoyaltyTransaction[];
  pagination: {
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor: string | null;
    previousCursor: string | null;
  };
}

export const useLoyalty = () => {
  const { authenticatedFetch, user, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(
    globalLoyaltyState.data
  );

  // Create a unique instance ID for this hook instance
  const instanceId = useRef<string>(
    `instance_${Math.random().toString(36).substr(2, 9)}`
  );

  // Register this instance with the global state manager
  useEffect(() => {
    const id = instanceId.current;
    globalStateManager.activeInstances.add(id);

    // If this is the first instance, make it the primary
    if (!globalStateManager.primaryInstance) {
      globalStateManager.primaryInstance = id;
    }

    // Register state update callback
    globalStateManager.stateUpdateCallbacks.set(id, (state) => {
      setLoyaltyAccount(state.data);
      setError(state.error);
      setIsLoading(state.isLoading);
    });

    // Cleanup on unmount
    return () => {
      globalStateManager.activeInstances.delete(id);
      globalStateManager.stateUpdateCallbacks.delete(id);

      // If this was the primary instance, assign a new primary
      if (globalStateManager.primaryInstance === id) {
        const remainingInstances = Array.from(
          globalStateManager.activeInstances
        );
        globalStateManager.primaryInstance =
          remainingInstances.length > 0 ? remainingInstances[0] : null;
      }
    };
  }, []);

  // Sync local state with global state when global state changes
  useEffect(() => {
    if (
      user &&
      globalLoyaltyState.data &&
      globalLoyaltyState.lastFetchUserId === user.id
    ) {
      if (loyaltyAccount !== globalLoyaltyState.data) {
        setLoyaltyAccount(globalLoyaltyState.data);
        setError(globalLoyaltyState.error);
        setIsLoading(globalLoyaltyState.isLoading);
      }
    }
  }, [user, loyaltyAccount]);
  const [isLoading, setIsLoading] = useState(globalLoyaltyState.isLoading);
  const [error, setError] = useState<string | null>(globalLoyaltyState.error);
  const isFetchingRef = useRef(false);
  const effectRunningRef = useRef(false);

  const fetchLoyaltyAccount = useCallback(async () => {
    if (!user || !user.roles?.includes('CUSTOMER')) {
      return;
    }

    // Check if we already have data for this user
    if (
      globalLoyaltyState.lastFetchUserId === user.id &&
      globalLoyaltyState.data
    ) {
      setLoyaltyAccount(globalLoyaltyState.data);
      setError(globalLoyaltyState.error);
      setIsLoading(false);
      return;
    }

    // Prevent multiple simultaneous API calls globally
    if (globalLoyaltyState.isFetching) {
      return;
    }

    // Update global state
    globalLoyaltyState.isFetching = true;
    globalLoyaltyState.isLoading = true;
    globalLoyaltyState.error = null;

    // Update local state
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    // Notify all instances of the loading state change
    globalStateManager.stateUpdateCallbacks.forEach((callback) => {
      callback(globalLoyaltyState);
    });

    try {
      const response = await authenticatedFetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.LOYALTY.ME)
      );

      if (response.ok) {
        const data = await response.json();

        // Update global state
        globalLoyaltyState.data = data;
        globalLoyaltyState.error = null;
        globalLoyaltyState.lastFetchUserId = user.id;

        // Update local state
        setLoyaltyAccount(data);
        setError(null);

        // Notify all instances of the state change
        globalStateManager.stateUpdateCallbacks.forEach((callback) => {
          callback(globalLoyaltyState);
        });
      } else if (response.status === 404) {
        // User doesn't have a loyalty account yet - this is normal, not an error

        // Update global state
        globalLoyaltyState.data = null;
        globalLoyaltyState.error = null;
        globalLoyaltyState.lastFetchUserId = user.id;

        // Update local state
        setLoyaltyAccount(null);
        setError(null);
      } else {
        // Only set error for actual server errors, not 404s

        // Update global state
        globalLoyaltyState.error = 'Failed to fetch loyalty account';
        globalLoyaltyState.data = null;
        globalLoyaltyState.lastFetchUserId = user.id;

        // Update local state
        setError('Failed to fetch loyalty account');
        setLoyaltyAccount(null);
      }
    } catch (err) {
      // Only set error for network/parsing errors
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';

      // Update global state
      globalLoyaltyState.error = errorMessage;
      globalLoyaltyState.data = null;
      globalLoyaltyState.lastFetchUserId = user.id;

      // Update local state
      setError(errorMessage);
      setLoyaltyAccount(null);
    } finally {
      // Update global state
      globalLoyaltyState.isLoading = false;
      globalLoyaltyState.isFetching = false;

      // Update local state
      setIsLoading(false);
      isFetchingRef.current = false;

      // Notify all instances of the final state change
      globalStateManager.stateUpdateCallbacks.forEach((callback) => {
        callback(globalLoyaltyState);
      });
    }
  }, [user, authenticatedFetch]);

  const fetchTransactions = useCallback(
    async (
      cursor?: string,
      limit: number = 20
    ): Promise<PaginatedTransactions | null> => {
      if (!user || !user.roles?.includes('CUSTOMER')) {
        return null;
      }

      try {
        const params = new URLSearchParams();
        if (cursor) params.append('cursor', cursor);
        if (limit) params.append('limit', limit.toString());

        const response = await authenticatedFetch(
          `${buildApiUrl(
            API_CONFIG.ENDPOINTS.LOYALTY.TRANSACTIONS
          )}?${params.toString()}`
        );

        if (response.ok) {
          return await response.json();
        } else {
          throw new Error('Failed to fetch transactions');
        }
      } catch (err) {
        console.error('Error fetching loyalty transactions:', err);
        return null;
      }
    },
    [user, authenticatedFetch]
  );

  // Auto-fetch loyalty account when user changes - only primary instance manages state
  useEffect(() => {
    const id = instanceId.current;
    const isPrimary = globalStateManager.primaryInstance === id;

    // Only the primary instance should manage the global state
    if (!isPrimary) {
      return;
    }

    // Prevent multiple simultaneous effect runs
    if (effectRunningRef.current) {
      return;
    }

    // Wait for auth to finish loading before attempting to fetch loyalty data
    if (authLoading) {
      return;
    }

    // If we already have data for this user, don't do anything
    if (
      user &&
      globalLoyaltyState.data &&
      globalLoyaltyState.lastFetchUserId === user.id
    ) {
      return;
    }

    effectRunningRef.current = true;

    if (user && user.roles?.includes('CUSTOMER')) {
      // Call fetchLoyaltyAccount directly to avoid dependency issues
      fetchLoyaltyAccount().finally(() => {
        effectRunningRef.current = false;
      });
    } else {
      // Only clear state if this is a different user or user is actually logged out
      if (
        globalLoyaltyState.lastFetchUserId &&
        globalLoyaltyState.lastFetchUserId !== user?.id
      ) {
        // Clear global state when user changes
        globalLoyaltyState.data = null;
        globalLoyaltyState.error = null;
        globalLoyaltyState.lastFetchUserId = null;
        globalLoyaltyState.isLoading = false;
        globalLoyaltyState.isFetching = false;

        // Notify all instances of the state change
        globalStateManager.stateUpdateCallbacks.forEach((callback) => {
          callback(globalLoyaltyState);
        });
      }

      setLoyaltyAccount(null);
      setError(null);
      setIsLoading(false);
      effectRunningRef.current = false;
    }
  }, [user, authLoading, fetchLoyaltyAccount]);

  // Helper function to translate loyalty tier names
  const translateTierName = (tierName: string): string => {
    // Convert tier name to lowercase for consistent lookup
    const normalizedTierName = tierName.toLowerCase();

    // Try to get translation from the messages
    const translationKey = `header.loyalty.tiers.${normalizedTierName}`;
    const translatedName = t(translationKey);

    // If translation exists and is different from the key, return it
    if (translatedName !== translationKey) {
      return translatedName;
    }

    // Fallback to original tier name if no translation found
    return tierName;
  };

  return {
    loyaltyAccount,
    isLoading,
    error,
    fetchLoyaltyAccount,
    fetchTransactions,
    isCustomer: user?.roles?.includes('CUSTOMER') || false,
    translateTierName,
  };
};

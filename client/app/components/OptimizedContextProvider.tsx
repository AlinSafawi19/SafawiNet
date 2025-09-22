'use client';

import React, {
  createContext,
  useContext as useReactContext,
  useMemo,
  ReactNode,
} from 'react';

// Generic optimized context provider
export function createOptimizedContext<T>(defaultValue: T) {
  const Context = createContext<T>(defaultValue);

  const Provider: React.FC<{ value: T; children: ReactNode }> = ({
    value,
    children,
  }) => {
    // Memoize the context value to prevent unnecessary re-renders
    const memoizedValue = useMemo(() => value, [value]);

    return (
      <Context.Provider value={memoizedValue}>{children}</Context.Provider>
    );
  };

  const useOptimizedContext = (): T => {
    const context = useReactContext(Context);
    if (context === undefined) {
      throw new Error('useOptimizedContext must be used within its Provider');
    }
    return context;
  };

  return { Provider, useContext: useOptimizedContext };
}

// Higher-order component for optimizing context providers
export function withOptimizedProvider<P extends object>(
  Component: React.ComponentType<P>,
  ContextProvider: React.ComponentType<{ children: ReactNode }>
) {
  const OptimizedComponent: React.FC<P> = (props) => {
    return (
      <ContextProvider>
        <Component {...props} />
      </ContextProvider>
    );
  };

  OptimizedComponent.displayName = `withOptimizedProvider(${
    Component.displayName || Component.name
  })`;

  return OptimizedComponent;
}

// Hook for preventing unnecessary re-renders
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = React.useRef<T>(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  });

  return React.useCallback(
    (...args: any[]) => callbackRef.current(...args),
    []
  ) as T;
}

// Hook for stable object references
export function useStableValue<T>(value: T): T {
  const ref = React.useRef<T>(value);

  if (JSON.stringify(ref.current) !== JSON.stringify(value)) {
    ref.current = value;
  }

  return ref.current;
}

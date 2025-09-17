import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { socketSingleton } from '../services/socket.singleton';

export const useSocket = () => {
  const { user } = useAuth();

  const connect = useCallback(async (token?: string) => {
    await socketSingleton.ensureConnection(token);
  }, []);

  const disconnect = useCallback(async () => {
    socketSingleton.disconnect();
  }, []);

  // Ensure socket is ready for immediate use
  const ensureReady = useCallback(async () => {
    await socketSingleton.ensureReady();
  }, []);

  const joinVerificationRoom = useCallback(async (userId: string) => {
    await socketSingleton.ensureReady();
    await socketSingleton.joinVerificationRoom(userId);
  }, []);

  const leaveVerificationRoom = useCallback(async (userId: string) => {
    await socketSingleton.ensureReady();
    await socketSingleton.leaveVerificationRoom(userId);
  }, []);

  const joinPendingVerificationRoom = useCallback(async (email: string) => {
    await socketSingleton.ensureReady();
    await socketSingleton.joinPendingVerificationRoom(email);
  }, []);

  const leavePendingVerificationRoom = useCallback(async (email: string) => {
    await socketSingleton.ensureReady();
    await socketSingleton.leavePendingVerificationRoom(email);
  }, []);

  const joinPasswordResetRoom = useCallback(async (email: string) => {
    await socketSingleton.ensureReady();
    await socketSingleton.joinPasswordResetRoom(email);
  }, []);

  const leavePasswordResetRoom = useCallback(async (email: string) => {
    await socketSingleton.ensureReady();
    await socketSingleton.leavePasswordResetRoom(email);
  }, []);

  const on = useCallback(
    async <T extends keyof import('../services/socket.singleton').SocketEvents>(
      event: T,
      callback: import('../services/socket.singleton').SocketEvents[T]
    ) => {
      await socketSingleton.ensureReady();
      socketSingleton.on(event, callback);
    },
    []
  );

  const off = useCallback(
    async <T extends keyof import('../services/socket.singleton').SocketEvents>(
      event: T,
      callback: import('../services/socket.singleton').SocketEvents[T]
    ) => {
      await socketSingleton.ensureReady();
      await socketSingleton.off(event, callback);
    },
    []
  );

  // Listen for authentication broadcasts from other devices
  const onAuthBroadcast = useCallback(
    async (callback: (data: { type: string; user?: any }) => void) => {
      await socketSingleton.ensureReady();
      await socketSingleton.onAuthBroadcast(callback);
    },
    []
  );

  // Remove auth broadcast listener
  const offAuthBroadcast = useCallback(
    async (callback: (data: { type: string; user?: any }) => void) => {
      await socketSingleton.ensureReady();
      await socketSingleton.offAuthBroadcast(callback);
    },
    []
  );

  // Auto-connect when user is authenticated
  useEffect(() => {
    const handleUserChange = async () => {
      if (user) {
        // Get token from cookies - updated to match backend JWT guard
        const cookies = document.cookie.split(';');
        const accessTokenCookie = cookies.find((cookie) =>
          cookie.trim().startsWith('accessToken=')
        );
        const accessToken = accessTokenCookie
          ? accessTokenCookie.split('=')[1]
          : undefined;

        if (accessToken) {
          await connect(accessToken);
        }
      } else {
        await disconnect();
      }
    };

    handleUserChange();

    return () => {
      // Cleanup on unmount - don't disconnect as other components might be using it
      // The singleton will handle cleanup when the page unloads
    };
  }, [user, connect, disconnect]);

  return {
    connect,
    disconnect,
    ensureReady,
    joinVerificationRoom,
    leaveVerificationRoom,
    joinPendingVerificationRoom,
    leavePendingVerificationRoom,
    joinPasswordResetRoom,
    leavePasswordResetRoom,
    on,
    off,
    onAuthBroadcast,
    offAuthBroadcast,
    isConnected: false, // Will be updated when service is initialized
  };
};

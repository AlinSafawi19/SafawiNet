import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socket.service';

export const useSocket = () => {
  const { user } = useAuth();

  const connect = useCallback((token?: string) => {
    socketService.connect(token);
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  const joinVerificationRoom = useCallback((userId: string) => {
    socketService.joinVerificationRoom(userId);
  }, []);

  const leaveVerificationRoom = useCallback((userId: string) => {
    socketService.leaveVerificationRoom(userId);
  }, []);

  const joinPendingVerificationRoom = useCallback((email: string) => {
    socketService.joinPendingVerificationRoom(email);
  }, []);

  const leavePendingVerificationRoom = useCallback((email: string) => {
    socketService.leavePendingVerificationRoom(email);
  }, []);

  const on = useCallback(
    <T extends keyof import('../services/socket.service').SocketEvents>(
      event: T,
      callback: import('../services/socket.service').SocketEvents[T]
    ) => {
      socketService.on(event, callback);
    },
    []
  );

  const off = useCallback(
    <T extends keyof import('../services/socket.service').SocketEvents>(
      event: T,
      callback: import('../services/socket.service').SocketEvents[T]
    ) => {
      socketService.off(event, callback);
    },
    []
  );

  // Listen for authentication broadcasts from other devices
  const onAuthBroadcast = useCallback(
    (callback: (data: { type: string; user?: any }) => void) => {
      socketService.onAuthBroadcast(callback);
    },
    []
  );

  // Remove auth broadcast listener
  const offAuthBroadcast = useCallback(
    (callback: (data: { type: string; user?: any }) => void) => {
      socketService.offAuthBroadcast(callback);
    },
    []
  );

  // Auto-connect when user is authenticated
  useEffect(() => {
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
        connect(accessToken);
      }
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return {
    connect,
    disconnect,
    joinVerificationRoom,
    leaveVerificationRoom,
    joinPendingVerificationRoom,
    leavePendingVerificationRoom,
    on,
    off,
    onAuthBroadcast,
    offAuthBroadcast,
    isConnected: socketService.isSocketConnected(),
  };
};

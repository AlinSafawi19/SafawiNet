import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initializeSocketService } from '../services/socket.service';

// Get the initialized socket service
const getSocketService = async () => {
  try {
    return await initializeSocketService();
  } catch (error) {
    console.warn('Failed to load socket service:', error);
    return null;
  }
};

export const useSocket = () => {
  const { user } = useAuth();

  const connect = useCallback(async (token?: string) => {
    const service = await getSocketService();
    if (service) {
      await service.connect(token);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const service = await getSocketService();
    if (service) {
      service.disconnect();
    }
  }, []);

  const joinVerificationRoom = useCallback(async (userId: string) => {
    const service = await getSocketService();
    if (service) {
      await service.joinVerificationRoom(userId);
    }
  }, []);

  const leaveVerificationRoom = useCallback(async (userId: string) => {
    const service = await getSocketService();
    if (service) {
      await service.leaveVerificationRoom(userId);
    }
  }, []);

  const joinPendingVerificationRoom = useCallback(async (email: string) => {
    const service = await getSocketService();
    if (service) {
      await service.joinPendingVerificationRoom(email);
    }
  }, []);

  const leavePendingVerificationRoom = useCallback(async (email: string) => {
    const service = await getSocketService();
    if (service) {
      await service.leavePendingVerificationRoom(email);
    }
  }, []);

  const joinPasswordResetRoom = useCallback(async (email: string) => {
    const service = await getSocketService();
    if (service) {
      await service.joinPasswordResetRoom(email);
    }
  }, []);

  const leavePasswordResetRoom = useCallback(async (email: string) => {
    const service = await getSocketService();
    if (service) {
      await service.leavePasswordResetRoom(email);
    }
  }, []);

  const on = useCallback(
    async <T extends keyof import('../services/socket.service').SocketEvents>(
      event: T,
      callback: import('../services/socket.service').SocketEvents[T]
    ) => {
      const service = await getSocketService();
      if (service) {
        await service.on(event, callback);
      }
    },
    []
  );

  const off = useCallback(
    async <T extends keyof import('../services/socket.service').SocketEvents>(
      event: T,
      callback: import('../services/socket.service').SocketEvents[T]
    ) => {
      const service = await getSocketService();
      if (service) {
        await service.off(event, callback);
      }
    },
    []
  );

  // Listen for authentication broadcasts from other devices
  const onAuthBroadcast = useCallback(
    async (callback: (data: { type: string; user?: any }) => void) => {
      const service = await getSocketService();
      if (service) {
        await service.onAuthBroadcast(callback);
      }
    },
    []
  );

  // Remove auth broadcast listener
  const offAuthBroadcast = useCallback(
    async (callback: (data: { type: string; user?: any }) => void) => {
      const service = await getSocketService();
      if (service) {
        await service.offAuthBroadcast(callback);
      }
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
      // Cleanup on unmount
      getSocketService().then((service) => {
        if (service) {
          service.disconnect();
        }
      });
    };
  }, [user, connect, disconnect]);

  return {
    connect,
    disconnect,
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

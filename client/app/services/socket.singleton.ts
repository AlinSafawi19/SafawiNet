import { io, Socket } from 'socket.io-client';
import { API_CONFIG, buildWebSocketUrl } from '../config/api';

export interface SocketEvents {
  emailVerified: (data: {
    success: boolean;
    user: any;
    message: string;
    tokens?: any;
  }) => void;
  emailVerificationFailed: (data: { success: boolean; error: string }) => void;
  loginSuccess: (data: { success: boolean; user: any }) => void;
  verificationRoomJoined: (data: { success: boolean; error?: string }) => void;
  verificationRoomLeft: (data: { success: boolean }) => void;
  pendingVerificationRoomJoined: (data: {
    success: boolean;
    email: string;
  }) => void;
  pendingVerificationRoomLeft: (data: {
    success: boolean;
    email: string;
  }) => void;
  passwordResetRoomJoined: (data: { success: boolean; email: string }) => void;
  passwordResetRoomLeft: (data: { success: boolean; email: string }) => void;
  forceLogout: (data: {
    reason: string;
    message: string;
    timestamp: string;
  }) => void;
  connect: () => void;
  disconnect: () => void;
  auth_broadcast: (data: { type: string; user?: any }) => void;
  rateLimitExceeded: (data: { type: string; message: string }) => void;
}

class SocketSingleton {
  private static instance: SocketSingleton | null = null;
  private static instanceCounter = 0;
  private instanceId: string;
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isInitialized = false;
  private connectionPromise: Promise<void> | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private cleanupTimeouts: Set<NodeJS.Timeout> = new Set();
  private isDestroyed = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private circuitBreakerFailures = 0;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 30000; // 30 seconds
  private lastCircuitBreakerReset = 0;
  private errorRetryQueue: Array<{
    operation: () => Promise<void>;
    retries: number;
    maxRetries: number;
    delay: number;
  }> = [];

  private constructor() {
    // Private constructor for singleton pattern
    SocketSingleton.instanceCounter++;
    this.instanceId = `instance_${SocketSingleton.instanceCounter}`;
  }

  public static getInstance(): SocketSingleton {
    if (!SocketSingleton.instance) {
      SocketSingleton.instance = new SocketSingleton();
    }
    return SocketSingleton.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (typeof window === 'undefined') {
      return; // Skip on server-side
    }

    try {
      const socketUrl = buildWebSocketUrl(API_CONFIG.ENDPOINTS.WEBSOCKET.AUTH);
      this.socket = io(socketUrl, {
        transports: ['websocket'],
        autoConnect: false,
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      this.setupEventListeners();
      this.isInitialized = true;
    } catch (error) {
      // Failed to initialize socket service
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Store event listeners for cleanup
    const connectHandler = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.recordConnectionSuccess();
      this.startHeartbeat();
      this.processErrorRetryQueue();
    };

    const disconnectHandler = () => {
      this.isConnected = false;
      this.stopHeartbeat();
      this.attemptReconnect();
    };

    const connectErrorHandler = (error: any) => {
      this.isConnected = false;
      this.stopHeartbeat();
      this.recordConnectionFailure();
      this.attemptReconnect();
    };

    const forceLogoutHandler = (data: any) => {
      window.dispatchEvent(new CustomEvent('forceLogout', { detail: data }));
    };

    const rateLimitHandler = (data: any) => {
      window.dispatchEvent(
        new CustomEvent('rateLimitExceeded', { detail: data })
      );
    };

    const authBroadcastHandler = (data: any) => {
      // Handle auth broadcast
    };

    // Register event listeners
    this.socket.on('connect', connectHandler);
    this.socket.on('disconnect', disconnectHandler);
    this.socket.on('connect_error', connectErrorHandler);
    this.socket.on('forceLogout', forceLogoutHandler);
    this.socket.on('RATE_LIMIT_EXCEEDED', rateLimitHandler);
    this.socket.on('auth_broadcast', authBroadcastHandler);

    // Store listeners for cleanup
    this.eventListeners.set('connect', [connectHandler]);
    this.eventListeners.set('disconnect', [disconnectHandler]);
    this.eventListeners.set('connect_error', [connectErrorHandler]);
    this.eventListeners.set('forceLogout', [forceLogoutHandler]);
    this.eventListeners.set('RATE_LIMIT_EXCEEDED', [rateLimitHandler]);
    this.eventListeners.set('auth_broadcast', [authBroadcastHandler]);

    // Set up heartbeat mechanism
    this.socket.on('pong', () => {
      this.lastHeartbeat = Date.now();
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');

        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          // No pong received, consider connection dead
          this.socket?.disconnect();
        }, 10000); // 10 second timeout (increased from 5)
      }
    }, 60000); // Send ping every 60 seconds (increased from 30)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private attemptReconnect() {
    if (this.isDestroyed) return;

    // Check circuit breaker
    if (this.circuitBreakerState === 'open') {
      const now = Date.now();
      if (now - this.lastCircuitBreakerReset > this.circuitBreakerTimeout) {
        this.circuitBreakerState = 'half-open';
        this.lastCircuitBreakerReset = now;
      } else {
        return; // Circuit breaker is open, don't attempt reconnection
      }
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      const timeout = setTimeout(() => {
        if (this.socket && !this.isConnected && !this.isDestroyed) {
          this.socket.connect();
        }
        this.cleanupTimeouts.delete(timeout);
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // Exponential backoff

      this.cleanupTimeouts.add(timeout);
    } else {
      // Max reconnection attempts reached. Stopping reconnection attempts.
      // Reset reconnection attempts after a longer delay to allow for backend recovery
      const timeout = setTimeout(() => {
        this.reconnectAttempts = 0;
        this.cleanupTimeouts.delete(timeout);
      }, 60000); // 60 seconds (increased from 30)

      this.cleanupTimeouts.add(timeout);
    }
  }

  private recordConnectionFailure() {
    this.circuitBreakerFailures++;

    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      this.circuitBreakerState = 'open';
      this.lastCircuitBreakerReset = Date.now();
    }
  }

  private recordConnectionSuccess() {
    this.circuitBreakerFailures = 0;
    this.circuitBreakerState = 'closed';
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  private processErrorRetryQueue() {
    if (this.errorRetryQueue.length === 0) return;

    const queue = [...this.errorRetryQueue];
    this.errorRetryQueue = [];

    queue.forEach(async (item) => {
      try {
        await item.operation();
      } catch (error) {
        if (item.retries < item.maxRetries) {
          item.retries++;
          item.delay *= 2; // Exponential backoff

          setTimeout(() => {
            this.errorRetryQueue.push(item);
            this.processErrorRetryQueue();
          }, item.delay);
        }
      }
    });
  }

  public async connect(token?: string): Promise<void> {
    // If already connected, don't connect again
    if (this.isConnected) {
      return;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.socket && !this.isConnected) {
      if (token) {
        this.socket.auth = { token };
      }

      this.connectionPromise = new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        // Set up one-time listeners for connection events
        const onConnect = () => {
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onError);
          this.connectionPromise = null;
          resolve();
        };

        const onError = (error: any) => {
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onError);
          this.connectionPromise = null;
          reject(error);
        };

        // Add listeners
        this.socket.on('connect', onConnect);
        this.socket.on('connect_error', onError);

        // Start connection
        this.socket.connect();
      });

      return this.connectionPromise;
    }
  }

  public disconnect(): void {
    if (this.socket && this.isConnected) {
      this.socket.disconnect();
      this.isConnected = false;
    }
    this.stopHeartbeat();
  }

  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.stopHeartbeat();

    // Clear all timeouts
    this.cleanupTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.cleanupTimeouts.clear();

    // Remove all event listeners
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach((listener) => {
        if (this.socket) {
          this.socket.off(event, listener as (...args: any[]) => void);
        }
      });
    });
    this.eventListeners.clear();

    // Disconnect socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.isInitialized = false;
    this.connectionPromise = null;
  }

  public async joinVerificationRoom(userId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      if (this.socket && this.isConnected) {
        this.socket.emit('joinVerificationRoom', { userId });
      } else {
        throw new Error('Socket not connected');
      }
    });
  }

  public async leaveVerificationRoom(userId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      if (this.socket && this.isConnected) {
        this.socket.emit('leaveVerificationRoom', { userId });
      } else {
        throw new Error('Socket not connected');
      }
    });
  }

  public async joinPendingVerificationRoom(email: string): Promise<void> {
    return this.executeWithRetry(async () => {
      if (this.socket && this.isConnected) {
        this.socket.emit('joinPendingVerificationRoom', { email });
      } else if (this.socket && !this.isConnected) {
        // Wait for connection to be established
        await new Promise<void>((resolve, reject) => {
          const checkConnection = () => {
            if (this.isConnected) {
              this.socket?.emit('joinPendingVerificationRoom', { email });
              resolve();
            } else if (this.isDestroyed) {
              reject(new Error('Socket destroyed'));
            } else {
              setTimeout(checkConnection, 100); // Check every 100ms
            }
          };
          checkConnection();
        });
      } else {
        throw new Error('Socket not initialized');
      }
    });
  }

  public async leavePendingVerificationRoom(email: string): Promise<void> {
    return this.executeWithRetry(async () => {
      if (this.socket && this.isConnected) {
        this.socket.emit('leavePendingVerificationRoom', { email });
      } else {
        throw new Error('Socket not connected');
      }
    });
  }

  public async joinPasswordResetRoom(email: string): Promise<void> {
    return this.executeWithRetry(async () => {
      if (this.socket && this.isConnected) {
        this.socket.emit('joinPasswordResetRoom', { email });
      } else if (this.socket && !this.isConnected) {
        // Wait for connection to be established
        await new Promise<void>((resolve, reject) => {
          const checkConnection = () => {
            if (this.isConnected) {
              this.socket?.emit('joinPasswordResetRoom', { email });
              resolve();
            } else if (this.isDestroyed) {
              reject(new Error('Socket destroyed'));
            } else {
              setTimeout(checkConnection, 100); // Check every 100ms
            }
          };
          checkConnection();
        });
      } else {
        throw new Error('Socket not initialized');
      }
    });
  }

  public async leavePasswordResetRoom(email: string): Promise<void> {
    return this.executeWithRetry(async () => {
      if (this.socket && this.isConnected) {
        this.socket.emit('leavePasswordResetRoom', { email });
      } else {
        throw new Error('Socket not connected');
      }
    });
  }

  public on<T extends keyof SocketEvents>(
    event: T,
    callback: SocketEvents[T]
  ): void {
    if (this.socket && !this.isDestroyed) {
      this.socket.on(event, callback as any);

      // Track listener for cleanup
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners
        .get(event)!
        .push(callback as (...args: any[]) => void);
    }
  }

  public async off<T extends keyof SocketEvents>(
    event: T,
    callback: SocketEvents[T]
  ): Promise<void> {
    if (this.socket && !this.isDestroyed) {
      this.socket.off(event, callback as any);

      // Remove from tracked listeners
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback as (...args: any[]) => void);
        if (index > -1) {
          listeners.splice(index, 1);
        }
        if (listeners.length === 0) {
          this.eventListeners.delete(event);
        }
      }
    }
  }

  // Listen for authentication broadcasts from other devices
  public async onAuthBroadcast(
    callback: (data: { type: string; user?: any }) => void
  ): Promise<void> {
    if (this.socket) {
      this.socket.on('auth_broadcast', callback);
    }
  }

  // Remove auth broadcast listener
  public async offAuthBroadcast(
    callback: (data: { type: string; user?: any }) => void
  ): Promise<void> {
    if (this.socket) {
      this.socket.off('auth_broadcast', callback);
    }
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public async ensureConnection(token?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isConnected) {
      await this.connect(token);
    }
  }

  // Ensure socket is ready for immediate use
  public async ensureReady(): Promise<void> {
    // If we have a socket and it's connected, we're ready
    if (this.socket && this.isConnected) {
      return;
    }

    // If we have a socket but state is inconsistent, fix it
    if (this.socket && !this.isInitialized) {
      this.isInitialized = true;
    }

    // If we're already in the process of connecting, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    // If not connected, connect without token (anonymous connection)
    if (!this.isConnected) {
      await this.connect();
    }
  }

  private getInstanceId(): string {
    return this.instanceId;
  }

  // Add page unload cleanup
  private setupPageUnloadCleanup() {
    if (typeof window !== 'undefined') {
      const cleanup = () => {
        this.destroy();
      };

      window.addEventListener('beforeunload', cleanup);
      window.addEventListener('unload', cleanup);

      // Store cleanup function for potential removal
      this.eventListeners.set('pageUnload', [cleanup]);
    }
  }
}

// Export singleton instance
export const socketSingleton = SocketSingleton.getInstance();

// Set up page unload cleanup
if (typeof window !== 'undefined') {
  socketSingleton['setupPageUnloadCleanup']();
}

export default socketSingleton;

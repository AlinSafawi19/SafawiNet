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

  private constructor() {
    // Private constructor for singleton pattern
    SocketSingleton.instanceCounter++;
    this.instanceId = `instance_${SocketSingleton.instanceCounter}`;
    console.log('🔧 SocketSingleton constructor called', {
      instanceId: this.instanceId
    });
  }

  public static getInstance(): SocketSingleton {
    if (!SocketSingleton.instance) {
      SocketSingleton.instance = new SocketSingleton();
    }
    return SocketSingleton.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔧 Socket already initialized, skipping initialization', {
        instanceId: this.getInstanceId(),
        socketExists: !!this.socket
      });
      return;
    }

    if (typeof window === 'undefined') {
      return; // Skip on server-side
    }

    try {
      const socketUrl = buildWebSocketUrl(API_CONFIG.ENDPOINTS.WEBSOCKET.AUTH);
      console.log('🔧 Creating socket connection to:', socketUrl, {
        instanceId: this.getInstanceId()
      });
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        withCredentials: true,
      });

      this.setupEventListeners();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize socket service:', error);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('🔌 Socket connected successfully');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('🔌 Socket disconnected');
      this.attemptReconnect();
    });

    // Listen for pending verification room responses
    this.socket.on('pendingVerificationRoomJoined', (data: any) => {
      console.log('✅ Server confirmed pending verification room joined:', data);
    });

    this.socket.on('pendingVerificationRoomLeft', (data: any) => {
      console.log('✅ Server confirmed pending verification room left:', data);
    });

    this.socket.on('connect_error', (error: any) => {
      this.isConnected = false;
      console.error('❌ Socket connection error:', error);
      this.attemptReconnect();
    });

    // Add general event listener to debug all events
    this.socket.onAny((eventName: string, ...args: any[]) => {
      console.log('📡 Received socket event:', eventName, 'with data:', args);
      if (eventName === 'emailVerified') {
        console.log('🎯 EMAIL VERIFIED EVENT RECEIVED!', args);
      }
    });

    // Set up force logout listener immediately when socket is created
    this.socket.on('forceLogout', (data: any) => {
      // Emit a custom event that the AuthContext can listen to
      window.dispatchEvent(new CustomEvent('forceLogout', { detail: data }));
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      setTimeout(() => {
        if (this.socket && !this.isConnected) {
          this.socket.connect();
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      // Max reconnection attempts reached. Stopping reconnection attempts.
      // Reset reconnection attempts after a longer delay to allow for backend recovery
      setTimeout(() => {
        this.reconnectAttempts = 0;
      }, 30000); // 30 seconds
    }
  }

  public async connect(token?: string): Promise<void> {
    // If already connected, don't connect again
    if (this.isConnected) {
      console.log('🔧 Socket already connected, skipping connection');
      return;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.connectionPromise) {
      console.log('🔧 Connection already in progress, waiting...');
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
          console.error('❌ Socket connection failed:', error);
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onError);
          this.connectionPromise = null;
          reject(error);
        };

        // Add listeners
        this.socket.on('connect', onConnect);
        this.socket.on('connect_error', onError);

        // Start connection
        console.log('🔧 Attempting to connect socket...');
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
  }

  public async joinVerificationRoom(userId: string): Promise<void> {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinVerificationRoom', { userId });
    }
  }

  public async leaveVerificationRoom(userId: string): Promise<void> {
    if (this.socket && this.isConnected) {
      this.socket.emit('leaveVerificationRoom', { userId });
    }
  }

  public async joinPendingVerificationRoom(email: string): Promise<void> {
    console.log('🔧 Attempting to join pending verification room for email:', email);
    if (this.socket && this.isConnected) {
      console.log('🔧 Emitting joinPendingVerificationRoom message to server');
      this.socket.emit('joinPendingVerificationRoom', { email });
    } else if (this.socket && !this.isConnected) {
      console.log('🔧 Socket not connected, waiting for connection...');
      // Wait for connection to be established
      await new Promise<void>((resolve) => {
        const checkConnection = () => {
          if (this.isConnected) {
            console.log('🔧 Connection established, emitting joinPendingVerificationRoom message');
            this.socket?.emit('joinPendingVerificationRoom', { email });
            resolve();
          } else {
            setTimeout(checkConnection, 100); // Check every 100ms
          }
        };
        checkConnection();
      });
    } else {
      console.warn(
        '⚠️ Cannot join pending verification room - socket not initialized'
      );
    }
  }

  public async leavePendingVerificationRoom(email: string): Promise<void> {
    if (this.socket && this.isConnected) {
      this.socket.emit('leavePendingVerificationRoom', { email });
    }
  }

  public async joinPasswordResetRoom(email: string): Promise<void> {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinPasswordResetRoom', { email });
    } else if (this.socket && !this.isConnected) {
      // Wait for connection to be established
      await new Promise<void>((resolve) => {
        const checkConnection = () => {
          if (this.isConnected) {
            this.socket?.emit('joinPasswordResetRoom', { email });
            resolve();
          } else {
            setTimeout(checkConnection, 100); // Check every 100ms
          }
        };
        checkConnection();
      });
    } else {
      console.warn(
        '⚠️ Cannot join password reset room - socket not initialized'
      );
    }
  }

  public async leavePasswordResetRoom(email: string): Promise<void> {
    if (this.socket && this.isConnected) {
      this.socket.emit('leavePasswordResetRoom', { email });
    }
  }

  public on<T extends keyof SocketEvents>(
    event: T,
    callback: SocketEvents[T]
  ): void {
    console.log('🔧 Setting up socket listener for event:', event, { socketExists: !!this.socket, isConnected: this.isConnected });
    if (this.socket) {
      this.socket.on(event, callback as any);
      console.log('✅ Socket listener set up for event:', event);
    } else {
      console.warn('⚠️ Cannot set up socket listener - socket not initialized');
    }
  }

  public async off<T extends keyof SocketEvents>(
    event: T,
    callback: SocketEvents[T]
  ): Promise<void> {
    if (this.socket) {
      this.socket.off(event, callback as any);
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
    console.log('🔧 Ensuring socket is ready...', { 
      isInitialized: this.isInitialized, 
      isConnected: this.isConnected,
      socketExists: !!this.socket,
      instanceId: this.getInstanceId()
    });
    
    // If we have a socket but state is inconsistent, fix it
    if (this.socket && !this.isInitialized) {
      console.log('🔧 Socket exists but not marked as initialized, fixing state...');
      this.isInitialized = true;
    }
    
    // If we have a socket and it's connected, we're ready
    if (this.socket && this.isConnected) {
      console.log('🔧 Socket already ready, skipping initialization');
      return;
    }
    
    if (!this.isInitialized) {
      console.log('🔧 Initializing socket...');
      await this.initialize();
    }
    
    // If not connected, connect without token (anonymous connection)
    if (!this.isConnected) {
      console.log('🔧 Connecting socket...');
      await this.connect();
    }
    
    console.log('✅ Socket is ready!', { 
      isInitialized: this.isInitialized, 
      isConnected: this.isConnected,
      socketExists: !!this.socket,
      instanceId: this.getInstanceId()
    });
  }

  private getInstanceId(): string {
    return this.instanceId;
  }
}

// Export singleton instance
export const socketSingleton = SocketSingleton.getInstance();
export default socketSingleton;

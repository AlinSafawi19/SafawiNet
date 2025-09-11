import { io, Socket } from 'socket.io-client';

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
  passwordResetRoomJoined: (data: {
    success: boolean;
    email: string;
  }) => void;
  passwordResetRoomLeft: (data: {
    success: boolean;
    email: string;
  }) => void;
  forceLogout: (data: {
    reason: string;
    message: string;
    timestamp: string;
  }) => void;
  connect: () => void;
  disconnect: () => void;
}

class RealSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.socket = io('http://localhost:3000/auth', {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        withCredentials: true,
      });

      this.setupEventListeners();
    } catch (error) {
      console.warn('Failed to initialize socket service:', error);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('🔌 Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('🔌 Socket disconnected');
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error: any) => {
      this.isConnected = false;
      console.error('❌ Socket connection error:', error);
      this.attemptReconnect();
    });

    // Set up force logout listener immediately when socket is created
    this.socket.on('forceLogout', (data: any) => {
      console.log('🚪 Force logout event received in socket service:', data);
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
    if (this.socket && !this.isConnected) {
      if (token) {
        this.socket.auth = { token };
      }

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        // Set up one-time listeners for connection events
        const onConnect = () => {
          console.log('🔌 Socket connected successfully');
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onError);
          resolve();
        };

        const onError = (error: any) => {
          console.error('❌ Socket connection failed:', error);
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onError);
          reject(error);
        };

        // Add listeners
        this.socket.on('connect', onConnect);
        this.socket.on('connect_error', onError);

        // Start connection
        this.socket.connect();
      });
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
    if (this.socket && this.isConnected) {
      console.log('📡 Emitting joinPendingVerificationRoom for email:', email);
      this.socket.emit('joinPendingVerificationRoom', { email });
    } else if (this.socket && !this.isConnected) {
      console.log('⏳ Socket not connected yet, waiting for connection...');
      // Wait for connection to be established
      await new Promise<void>((resolve) => {
        const checkConnection = () => {
          if (this.isConnected) {
            console.log(
              '📡 Socket now connected, emitting joinPendingVerificationRoom for email:',
              email
            );
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
      console.log('📡 Emitting joinPasswordResetRoom for email:', email);
      this.socket.emit('joinPasswordResetRoom', { email });
    } else if (this.socket && !this.isConnected) {
      console.log('⏳ Socket not connected yet, waiting for connection...');
      // Wait for connection to be established
      await new Promise<void>((resolve) => {
        const checkConnection = () => {
          if (this.isConnected) {
            console.log(
              '📡 Socket now connected, emitting joinPasswordResetRoom for email:',
              email
            );
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
    if (this.socket) {
      console.log('👂 Setting up socket listener for event:', event);
      this.socket.on(event, callback as any);
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
}

export default RealSocketService;

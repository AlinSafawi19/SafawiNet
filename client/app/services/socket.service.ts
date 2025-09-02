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
  logout: (data: { success: boolean; message: string }) => void;
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
  connect: () => void;
  disconnect: () => void;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    // Initialize socket connection
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
      // Failed to initialize socket
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
      this.attemptReconnect();
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

  public connect(token?: string) {
    if (this.socket && !this.isConnected) {
      if (token) {
        this.socket.auth = { token };
      }
      this.socket.connect();
    }
  }

  public disconnect() {
    if (this.socket && this.isConnected) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  public joinVerificationRoom(userId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinVerificationRoom', { userId });
    }
  }

  public leaveVerificationRoom(userId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leaveVerificationRoom', { userId });
    }
  }

  public joinPendingVerificationRoom(email: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinPendingVerificationRoom', { email });
    }
  }

  public leavePendingVerificationRoom(email: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leavePendingVerificationRoom', { email });
    }
  }

  public on<T extends keyof SocketEvents>(event: T, callback: SocketEvents[T]) {
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  public off<T extends keyof SocketEvents>(
    event: T,
    callback: SocketEvents[T]
  ) {
    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  // Listen for authentication broadcasts from other devices
  public onAuthBroadcast(
    callback: (data: { type: string; user?: any }) => void
  ) {
    if (this.socket) {
      this.socket.on('auth_broadcast', callback);
    }
  }

  // Remove auth broadcast listener
  public offAuthBroadcast(
    callback: (data: { type: string; user?: any }) => void
  ) {
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

// Export singleton instance
export const socketService = new SocketService();
export default socketService;

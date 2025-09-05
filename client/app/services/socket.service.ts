// Stub socket service to prevent WebSocket dependencies from being bundled during build
// The real implementation will be loaded dynamically when needed

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
  connect: () => void;
  disconnect: () => void;
}

class StubSocketService {
  private isConnected = false;

  constructor() {
    // Stub implementation - no WebSocket dependencies
  }

  public async connect(token?: string): Promise<void> {
    // Stub - will be replaced by real implementation
    console.warn(
      'Socket service not initialized - use initializeSocketService first'
    );
  }

  public disconnect(): void {
    this.isConnected = false;
  }

  public async joinVerificationRoom(userId: string): Promise<void> {
    // Stub
  }

  public async leaveVerificationRoom(userId: string): Promise<void> {
    // Stub
  }

  public async joinPendingVerificationRoom(email: string): Promise<void> {
    // Stub
  }

  public async leavePendingVerificationRoom(email: string): Promise<void> {
    // Stub
  }

  public on<T extends keyof SocketEvents>(
    event: T,
    callback: SocketEvents[T]
  ): void {
    // Stub
  }

  public async off<T extends keyof SocketEvents>(
    event: T,
    callback: SocketEvents[T]
  ): Promise<void> {
    // Stub
  }

  public async onAuthBroadcast(
    callback: (data: { type: string; user?: any }) => void
  ): Promise<void> {
    // Stub
  }

  public async offAuthBroadcast(
    callback: (data: { type: string; user?: any }) => void
  ): Promise<void> {
    // Stub
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  public getSocket(): any {
    return null;
  }
}

// Export stub instance
export const socketService = new StubSocketService();
export default socketService;

// Function to initialize the real socket service
export const initializeSocketService = async () => {
  if (typeof window === 'undefined') {
    return socketService; // Return stub on server-side
  }

  try {
    // Dynamic import of the real implementation
    const realService = await import('./socket.service.real');
    const RealSocketService = realService.default;
    return new RealSocketService();
  } catch (error) {
    console.warn('Failed to load real socket service:', error);
    return socketService; // Return stub if real service fails to load
  }
};

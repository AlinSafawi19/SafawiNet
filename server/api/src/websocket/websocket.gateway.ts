import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { AuthenticatedSocket } from '../auth/guards/ws-jwt.guard';
import { isJwtPayload } from '../auth/types/jwt.types';
import { OfflineMessageService } from '../common/services/offline-message.service';
import { WebSocketRateLimitService } from '../common/services/websocket-rate-limit.service';

// User data interface for WebSocket events
interface UserData {
  id: string;
  email: string;
  name: string | null;
  isVerified: boolean;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}

// Authentication tokens interface
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// WebSocket event payload interfaces
interface VerificationSuccessPayload {
  success: true;
  user: UserData;
  message: string;
}

interface VerificationSuccessWithTokensPayload {
  success: true;
  user: UserData;
  tokens: AuthTokens;
  message: string;
}

interface VerificationFailurePayload {
  success: false;
  error: string;
}

interface LoginSuccessPayload {
  success: true;
  user: UserData;
}

interface ForceLogoutPayload {
  reason: string;
  message: string;
  timestamp: string;
}

interface AuthBroadcastPayload {
  type: 'login';
  user: UserData;
}

// Room state interface
interface RoomStates {
  verificationRooms: Record<string, string[]>;
  pendingVerificationRooms: Record<string, string[]>;
  passwordResetRooms: Record<string, string[]>;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all localhost origins for development
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
  namespace: '/auth',
})
export class AuthWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  private readonly verificationRooms = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private readonly pendingVerificationRooms = new Map<string, Set<string>>(); // email -> Set of socketIds
  private readonly passwordResetRooms = new Map<string, Set<string>>(); // email -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly offlineMessageService: OfflineMessageService,
    private readonly rateLimitService: WebSocketRateLimitService,
  ) {}

  afterInit(server: Server) {
    this.server = server;
  }

  /**
   * Check if a message is allowed based on rate limits
   */
  private async checkMessageRateLimit(client: AuthenticatedSocket): Promise<boolean> {
    const isAllowed = await this.rateLimitService.checkMessageLimit(client.id);
    if (!isAllowed) {
      client.emit('error', {
        type: 'RATE_LIMIT_EXCEEDED',
        message: 'Message rate limit exceeded. Please slow down.',
      });
    }
    return isAllowed;
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Ensure server is initialized
      if (!this.server) {
        client.disconnect();
        return;
      }

      // Check connection rate limit
      const isConnectionAllowed = await this.rateLimitService.checkConnectionLimit(client.id);
      if (!isConnectionAllowed) {
        client.emit('error', {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Connection rate limit exceeded. Please try again later.',
        });
        client.disconnect();
        return;
      }

      // Extract token from handshake auth
      const token =
        (client.handshake.auth as { token?: string }).token ||
        (client.handshake.headers.authorization as string)?.replace(
          'Bearer ',
          '',
        );

      if (token) {
        try {
          const payload: unknown = this.jwtService.verify(token, {
            secret: this.configService.get<string>('JWT_SECRET'),
          });

          // Type guard for JWT payload
          if (!isJwtPayload(payload)) {
            throw new Error('Invalid token payload');
          }

          const { sub, email, verified } = payload;

          client.user = {
            id: sub,
            email: email,
            isVerified: verified,
          };

          // Join user to their personal room
          void client.join(`user:${client.user.id}`);

          // If user is not verified, add them to verification room
          if (!client.user.isVerified) {
            this.addToVerificationRoom(client.user.id, client.id);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          client.disconnect();
          return;
        }
      } else {
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      // Remove from verification room if they were there
      void this.removeFromVerificationRoom(client.user.id, client.id);
    } else {
    }

    // Remove from all pending verification rooms (for anonymous connections)
    // This is important for cross-browser sync cleanup
    for (const [email, room] of this.pendingVerificationRooms.entries()) {
      if (room.has(client.id)) {
        void this.removeFromPendingVerificationRoom(email, client.id);
      }
    }

    // Remove from all password reset rooms (for anonymous connections)
    for (const [email, room] of this.passwordResetRooms.entries()) {
      if (room.has(client.id)) {
        void this.removeFromPasswordResetRoom(email, client.id);
      }
    }
  }

  @SubscribeMessage('joinVerificationRoom')
  async handleJoinVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    // Check rate limit
    if (!(await this.checkMessageRateLimit(client))) {
      return;
    }
    if (client.user && client.user.id === data.userId) {
      this.addToVerificationRoom(data.userId, client.id);
      client.emit('verificationRoomJoined', { success: true });
    } else {
      client.emit('verificationRoomJoined', {
        success: false,
        error: 'Unauthorized',
      });
    }
  }

  @SubscribeMessage('leaveVerificationRoom')
  async handleLeaveVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    // Check rate limit
    if (!(await this.checkMessageRateLimit(client))) {
      return;
    }
    if (client.user && client.user.id === data.userId) {
      this.removeFromVerificationRoom(data.userId, client.id);
      client.emit('verificationRoomLeft', { success: true });
    }
  }

  @SubscribeMessage('joinPendingVerificationRoom')
  async handleJoinPendingVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string },
  ) {
    // Check rate limit
    if (!(await this.checkMessageRateLimit(client))) {
      return;
    }
    // Allow anonymous connections to join pending verification rooms
    const email = data.email.toLowerCase();
    void this.addToPendingVerificationRoom(email, client.id);
    client.emit('pendingVerificationRoomJoined', { success: true, email });

    // Log current room state
    const room = this.pendingVerificationRooms.get(email);
  }

  @SubscribeMessage('leavePendingVerificationRoom')
  async handleLeavePendingVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string },
  ) {
    // Check rate limit
    if (!(await this.checkMessageRateLimit(client))) {
      return;
    }
    const email = data.email.toLowerCase();
    void this.removeFromPendingVerificationRoom(email, client.id);
    client.emit('pendingVerificationRoomLeft', { success: true, email });
  }

  @SubscribeMessage('joinPasswordResetRoom')
  async handleJoinPasswordResetRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string },
  ) {
    // Check rate limit
    if (!(await this.checkMessageRateLimit(client))) {
      return;
    }
    // Allow anonymous connections to join password reset rooms
    const email = data.email.toLowerCase();

    void this.addToPasswordResetRoom(email, client.id);
    client.emit('passwordResetRoomJoined', { success: true, email });
    // Log current room state
    const room = this.passwordResetRooms.get(email);
  }

  @SubscribeMessage('leavePasswordResetRoom')
  async handleLeavePasswordResetRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string },
  ) {
    // Check rate limit
    if (!(await this.checkMessageRateLimit(client))) {
      return;
    }
    const email = data.email.toLowerCase();
    this.removeFromPasswordResetRoom(email, client.id);
    client.emit('passwordResetRoomLeft', { success: true, email });
  }

  private addToVerificationRoom(userId: string, socketId: string) {
    if (!this.server) {
      return;
    }

    if (!this.verificationRooms.has(userId)) {
      this.verificationRooms.set(userId, new Set());
    }
    this.verificationRooms.get(userId)!.add(socketId);

    // Join the socket to the verification room
    // Use the server's socket adapter to join the room
    try {
      this.server.in(socketId).socketsJoin(`verification:${userId}`);
    } catch (error) {
    
    }
  }

  private removeFromVerificationRoom(userId: string, socketId: string) {
    if (!this.server) {
 
      return;
    }

    const room = this.verificationRooms.get(userId);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.verificationRooms.delete(userId);
      }

      // Leave the verification room
      try {
        this.server.in(socketId).socketsLeave(`verification:${userId}`);
      } catch (error) {
     
      }
    }
  }

  private addToPendingVerificationRoom(email: string, socketId: string) {
    if (!this.server) {
  
      return;
    }

    if (!this.pendingVerificationRooms.has(email)) {
      this.pendingVerificationRooms.set(email, new Set());
    }
    this.pendingVerificationRooms.get(email)!.add(socketId);

    try {
      this.server.in(socketId).socketsJoin(`pending_verification:${email}`);
  
    } catch (error) {
 
    }
  }

  private removeFromPendingVerificationRoom(email: string, socketId: string) {
    if (!this.server) {

      return;
    }

    const room = this.pendingVerificationRooms.get(email);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.pendingVerificationRooms.delete(email);
      }

      try {
        this.server.in(socketId).socketsLeave(`pending_verification:${email}`);
 
      } catch (error) {

      }
    }
  }

  private addToPasswordResetRoom(email: string, socketId: string) {
    if (!this.server) {
  
      return;
    }

    if (!this.passwordResetRooms.has(email)) {
      this.passwordResetRooms.set(email, new Set());
    }
    this.passwordResetRooms.get(email)!.add(socketId);

    try {
      this.server.in(socketId).socketsJoin(`password_reset:${email}`);
    } catch (error) {

    }
  }

  private removeFromPasswordResetRoom(email: string, socketId: string) {
    if (!this.server) {
   
      return;
    }

    const room = this.passwordResetRooms.get(email);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.passwordResetRooms.delete(email);
      }

      try {
        this.server.in(socketId).socketsLeave(`password_reset:${email}`);
      
      } catch (error) {
 
      }
    }
  }

  // Method to emit verification success to all sockets in a user's verification room
  emitVerificationSuccess(userId: string, userData: UserData) {
    if (!this.server) {
  
      return;
    }

    const room = this.verificationRooms.get(userId);
    if (room && room.size > 0) {
      try {
        const payload: VerificationSuccessPayload = {
          success: true,
          user: userData,
          message: 'Email verified successfully. You are now logged in.',
        };

        this.server.to(`verification:${userId}`).emit('emailVerified', payload);

      } catch (error) {
     
      }
    } else {
      // No verification room - user is not connected via WebSocket
   
    }
  }

  // Method to emit verification success to pending verification room (for cross-browser sync)
  emitVerificationSuccessToPendingRoom(
    email: string,
    userData: UserData,
    tokens?: AuthTokens,
  ) {
    if (!this.server) {

      return;
    }

    const room = this.pendingVerificationRooms.get(email.toLowerCase());


    if (room && room.size > 0) {
      try {

        // Create payload with or without tokens
        const payload:
          | VerificationSuccessPayload
          | VerificationSuccessWithTokensPayload = tokens
          ? {
              success: true,
              user: userData,
              tokens: tokens,
              message: 'Email verified successfully! You are now logged in.',
            }
          : {
              success: true,
              user: userData,
              message: 'Email verified successfully! You are now logged in.',
            };

        // Emit to the room
        this.server
          .to(`pending_verification:${email.toLowerCase()}`)
          .emit('emailVerified', payload);


        // Clean up the pending verification room after successful emission
        this.pendingVerificationRooms.delete(email.toLowerCase());

        // Also remove all sockets from the room
        for (const socketId of room) {
          try {
            this.server
              .in(socketId)
              .socketsLeave(`pending_verification:${email.toLowerCase()}`);
          } catch (error) {
       
          }
        }

      } catch (error) {
 
      }
    } else {
    }
  }

  // Method to emit verification failure
  emitVerificationFailure(userId: string, error: string) {
    if (!this.server) {
      return;
    }

    const room = this.verificationRooms.get(userId);
    if (room && room.size > 0) {
      try {
        const payload: VerificationFailurePayload = {
          success: false,
          error,
        };

        this.server
          .to(`verification:${userId}`)
          .emit('emailVerificationFailed', payload);

      } catch (error) {
      }
    }
  }

  // Method to emit login success
  emitLoginSuccess(userId: string, userData: UserData) {
    if (!this.server) {

      return;
    }

    try {
      const payload: LoginSuccessPayload = {
        success: true,
        user: userData,
      };

      this.server.to(`user:${userId}`).emit('loginSuccess', payload);

    } catch (error) {
 
    }
  }

  // Method to broadcast login to all devices (called after successful verification)
  broadcastLogin(user: UserData) {
    if (!this.server) {
  
      return;
    }

    try {
      const payload: AuthBroadcastPayload = {
        type: 'login',
        user,
      };

      // Broadcast to all connected clients
      this.server.emit('auth_broadcast', payload);
    } catch (error) {
    }
  }

  // Method to emit logout event to all connected devices (global logout)
  emitGlobalLogout(reason: string = 'security_event') {
    if (!this.server) {
      return;
    }

    try {
      const payload: ForceLogoutPayload = {
        reason,
        message:
          'You have been logged out for security reasons. Please log in again.',
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all connected clients
      this.server.emit('forceLogout', payload);

    } catch (error) {
    }
  }

  // Debug method to get current room states
  getRoomStates(): RoomStates {
    return {
      verificationRooms: Object.fromEntries(
        Array.from(this.verificationRooms.entries()).map(
          ([userId, sockets]) => [userId, Array.from(sockets)],
        ),
      ),
      pendingVerificationRooms: Object.fromEntries(
        Array.from(this.pendingVerificationRooms.entries()).map(
          ([email, sockets]) => [email, Array.from(sockets)],
        ),
      ),
      passwordResetRooms: Object.fromEntries(
        Array.from(this.passwordResetRooms.entries()).map(
          ([email, sockets]) => [email, Array.from(sockets)],
        ),
      ),
    };
  }
}

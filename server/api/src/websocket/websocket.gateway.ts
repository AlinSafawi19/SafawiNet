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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { AuthenticatedSocket } from '../auth/guards/ws-jwt.guard';
import { isJwtPayload } from '../auth/types/jwt.types';
import { OfflineMessageService } from '../common/services/offline-message.service';

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
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/auth',
})
export class AuthWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AuthWebSocketGateway.name);
  private readonly verificationRooms = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private readonly pendingVerificationRooms = new Map<string, Set<string>>(); // email -> Set of socketIds
  private readonly passwordResetRooms = new Map<string, Set<string>>(); // email -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly offlineMessageService: OfflineMessageService,
  ) { }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.server = server;
  }

  handleConnection(client: AuthenticatedSocket) {
    try {
      // Ensure server is initialized
      if (!this.server) {
        this.logger.error('WebSocket server not initialized');
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

          this.logger.log(
            `Authenticated WebSocket connection for user ${client.user.email}`,
          );

          // Join user to their personal room
          void client.join(`user:${client.user.id}`);

          // If user is not verified, add them to verification room
          if (!client.user.isVerified) {
            this.addToVerificationRoom(client.user.id, client.id);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            `Invalid token in WebSocket connection: ${errorMessage}`,
          );
          client.disconnect();
          return;
        }
      } else {
        this.logger.log('Anonymous WebSocket connection');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling WebSocket connection: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.logger.log(`WebSocket disconnected for user ${client.user.email}`);
      // Remove from verification room if they were there
      void this.removeFromVerificationRoom(client.user.id, client.id);
    } else {
      this.logger.log('Anonymous WebSocket disconnected');
    }

    // Remove from all pending verification rooms (for anonymous connections)
    // This is important for cross-browser sync cleanup
    for (const [email, room] of this.pendingVerificationRooms.entries()) {
      if (room.has(client.id)) {
        this.logger.log(
          `🧹 Cleaning up anonymous client ${client.id} from pending verification room for ${email}`,
        );
        void this.removeFromPendingVerificationRoom(email, client.id);
      }
    }

    // Remove from all password reset rooms (for anonymous connections)
    for (const [email, room] of this.passwordResetRooms.entries()) {
      if (room.has(client.id)) {
        this.logger.log(
          `🧹 Cleaning up anonymous client ${client.id} from password reset room for ${email}`,
        );
        void this.removeFromPasswordResetRoom(email, client.id);
      }
    }
  }

  @SubscribeMessage('joinVerificationRoom')
  handleJoinVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
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
  handleLeaveVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    if (client.user && client.user.id === data.userId) {
      this.removeFromVerificationRoom(data.userId, client.id);
      client.emit('verificationRoomLeft', { success: true });
    }
  }

  @SubscribeMessage('joinPendingVerificationRoom')
  handleJoinPendingVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string },
  ) {
    // Allow anonymous connections to join pending verification rooms
    const email = data.email.toLowerCase();
    this.logger.log(
      `🔗 User ${client.id} attempting to join pending verification room for email: ${email}`,
    );

    void this.addToPendingVerificationRoom(email, client.id);
    client.emit('pendingVerificationRoomJoined', { success: true, email });
    this.logger.log(
      `✅ User ${client.id} successfully joined pending verification room for email: ${email}`,
    );

    // Log current room state
    const room = this.pendingVerificationRooms.get(email);
    this.logger.log(
      `📊 Pending verification room for ${email} now has ${room?.size || 0} users`,
    );

    // Log all current pending verification rooms for debugging
    this.logger.log(
      `📊 All pending verification rooms:`,
      this.getRoomStates().pendingVerificationRooms,
    );
  }

  @SubscribeMessage('leavePendingVerificationRoom')
  handleLeavePendingVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string },
  ) {
    const email = data.email.toLowerCase();
    this.logger.log(
      `🔗 User ${client.id} attempting to leave pending verification room for email: ${email}`,
    );
    void this.removeFromPendingVerificationRoom(email, client.id);
    client.emit('pendingVerificationRoomLeft', { success: true, email });
    this.logger.log(
      `✅ User ${client.id} successfully left pending verification room for email: ${email}`,
    );
  }

  @SubscribeMessage('joinPasswordResetRoom')
  handleJoinPasswordResetRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string },
  ) {
    // Allow anonymous connections to join password reset rooms
    const email = data.email.toLowerCase();
    this.logger.log(
      `🔗 User ${client.id} attempting to join password reset room for email: ${email}`,
    );

    void this.addToPasswordResetRoom(email, client.id);
    client.emit('passwordResetRoomJoined', { success: true, email });
    this.logger.log(
      `✅ User ${client.id} successfully joined password reset room for email: ${email}`,
    );

    // Log current room state
    const room = this.passwordResetRooms.get(email);
    this.logger.log(
      `📊 Password reset room for ${email} now has ${room?.size || 0} users`,
    );
  }

  @SubscribeMessage('leavePasswordResetRoom')
  handleLeavePasswordResetRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string },
  ) {
    const email = data.email.toLowerCase();
    this.logger.log(
      `🔗 User ${client.id} attempting to leave password reset room for email: ${email}`,
    );
    this.removeFromPasswordResetRoom(email, client.id);
    client.emit('passwordResetRoomLeft', { success: true, email });
    this.logger.log(
      `✅ User ${client.id} successfully left password reset room for email: ${email}`,
    );
  }

  private addToVerificationRoom(userId: string, socketId: string) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot add user to verification room',
      );
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
      this.logger.log(`User ${userId} added to verification room`);
    } catch (error) {
      this.logger.warn(
        `Failed to add user ${userId} to verification room:`,
        error,
      );
    }
  }

  private removeFromVerificationRoom(userId: string, socketId: string) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot remove user from verification room',
      );
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
        this.logger.log(`User ${userId} removed from verification room`);
      } catch (error) {
        this.logger.warn(
          `Failed to remove user ${userId} from verification room:`,
          error,
        );
      }
    }
  }

  private addToPendingVerificationRoom(email: string, socketId: string) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot add user to pending verification room',
      );
      return;
    }

    if (!this.pendingVerificationRooms.has(email)) {
      this.pendingVerificationRooms.set(email, new Set());
    }
    this.pendingVerificationRooms.get(email)!.add(socketId);

    try {
      this.server.in(socketId).socketsJoin(`pending_verification:${email}`);
      this.logger.log(
        `User added to pending verification room for email: ${email}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to add user to pending verification room for email ${email}:`,
        error,
      );
    }
  }

  private removeFromPendingVerificationRoom(email: string, socketId: string) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot remove user from pending verification room',
      );
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
        this.logger.log(
          `User removed from pending verification room for email: ${email}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to remove user from pending verification room for email ${email}:`,
          error,
        );
      }
    }
  }

  private addToPasswordResetRoom(email: string, socketId: string) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot add user to password reset room',
      );
      return;
    }

    if (!this.passwordResetRooms.has(email)) {
      this.passwordResetRooms.set(email, new Set());
    }
    this.passwordResetRooms.get(email)!.add(socketId);

    try {
      this.server.in(socketId).socketsJoin(`password_reset:${email}`);
      this.logger.log(`User added to password reset room for email: ${email}`);
    } catch (error) {
      this.logger.warn(
        `Failed to add user to password reset room for email ${email}:`,
        error,
      );
    }
  }

  private removeFromPasswordResetRoom(email: string, socketId: string) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot remove user from password reset room',
      );
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
        this.logger.log(
          `User removed from password reset room for email: ${email}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to remove user from password reset room for email ${email}:`,
          error,
        );
      }
    }
  }

  // Method to emit verification success to all sockets in a user's verification room
  async emitVerificationSuccess(userId: string, userData: UserData) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot emit verification success',
      );
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

        this.logger.log(`Verification success emitted to user ${userId}`);
      } catch (error) {
        this.logger.error(
          `Failed to emit verification success to user ${userId}:`,
          error,
        );
      }
    } else {
      // No verification room - user is not connected via WebSocket
      this.logger.log(`No verification room found for user ${userId} - user not connected via WebSocket`);
    }
  }

  // Method to emit verification success to pending verification room (for cross-browser sync)
  emitVerificationSuccessToPendingRoom(
    email: string,
    userData: UserData,
    tokens?: AuthTokens,
  ) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot emit verification success to pending room',
      );
      return;
    }

    this.logger.log(
      `🔍 Looking for pending verification room for email: ${email}`,
    );
    const room = this.pendingVerificationRooms.get(email.toLowerCase());
    this.logger.log(
      `📊 Pending verification room state for ${email}: ${room ? `Found with ${room.size} users` : 'Not found'}`,
    );
    this.logger.log(
      `📊 All pending verification rooms before emission:`,
      this.getRoomStates().pendingVerificationRooms,
    );

    if (room && room.size > 0) {
      try {
        this.logger.log(
          `📡 Emitting emailVerified to pending verification room: pending_verification:${email.toLowerCase()}`,
        );
        this.logger.log(`📡 Room contains sockets:`, Array.from(room));

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

        this.logger.log(
          `✅ Verification success emitted to pending room for email: ${email} with tokens`,
        );

        // Clean up the pending verification room after successful emission
        this.logger.log(
          `🧹 Cleaning up pending verification room for email: ${email}`,
        );
        this.pendingVerificationRooms.delete(email.toLowerCase());

        // Also remove all sockets from the room
        for (const socketId of room) {
          try {
            this.server
              .in(socketId)
              .socketsLeave(`pending_verification:${email.toLowerCase()}`);
          } catch (error) {
            this.logger.warn(
              `Failed to remove socket ${socketId} from pending verification room:`,
              error,
            );
          }
        }

        this.logger.log(
          `✅ Pending verification room cleaned up for email: ${email}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Failed to emit verification success to pending room for email ${email}:`,
          error,
        );
      }
    } else {
      this.logger.warn(
        `⚠️ No pending verification room found for email: ${email}`,
      );
      this.logger.log(
        `🔍 Available pending verification rooms:`,
        Array.from(this.pendingVerificationRooms.keys()),
      );
    }
  }

  // Method to emit verification failure
  emitVerificationFailure(userId: string, error: string) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot emit verification failure',
      );
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

        this.logger.log(`Verification failure emitted to user ${userId}`);
      } catch (error) {
        this.logger.error(
          `Failed to emit verification failure to user ${userId}:`,
          error,
        );
      }
    }
  }

  // Method to emit login success
  emitLoginSuccess(userId: string, userData: UserData) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot emit login success',
      );
      return;
    }

    try {
      const payload: LoginSuccessPayload = {
        success: true,
        user: userData,
      };

      this.server.to(`user:${userId}`).emit('loginSuccess', payload);

      this.logger.log(`Login success emitted to user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit login success to user ${userId}:`,
        error,
      );
    }
  }

  // Method to broadcast login to all devices (called after successful verification)
  broadcastLogin(user: UserData) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot broadcast login',
      );
      return;
    }

    try {
      const payload: AuthBroadcastPayload = {
        type: 'login',
        user,
      };

      // Broadcast to all connected clients
      this.server.emit('auth_broadcast', payload);
      this.logger.log(`Login broadcasted to all devices`);
    } catch (error) {
      this.logger.error(`Failed to broadcast login`, error);
    }
  }

  // Method to emit logout event to all user's devices (for password change)
  async emitLogoutToUserDevices(
    userId: string,
    reason: string = 'password_changed',
  ) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot emit logout to user devices',
      );
      return;
    }

    try {
      // Emit to user's personal room (all their devices)
      let message = 'Your password has been changed. Please log in again.';
      if (reason === '2fa_disabled') {
        message =
          'Two-factor authentication has been disabled. Please log in again.';
      } else if (reason === 'password_reset') {
        message =
          'Your password has been reset. Please log in with your new password.';
      }

      const payload: ForceLogoutPayload = {
        reason,
        message,
        timestamp: new Date().toISOString(),
      };

      // For security events, always create offline message AND emit to online users
      // This ensures the message is delivered even if WebSocket fails
      await this.offlineMessageService.createForceLogoutMessage(
        userId,
        reason,
        message,
      );

      // Also emit to online users if they're connected
      this.server.to(`user:${userId}`).emit('forceLogout', payload);
      this.logger.log(`Emitted forceLogout to online user ${userId}`);

      this.logger.log(
        `Offline message created and logout emitted for user ${userId} - reason: ${reason}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit logout to user devices for user ${userId}:`,
        error,
      );
    }
  }

  // Method to emit logout event to password reset room (for password reset)
  emitLogoutToPasswordResetRoom(
    email: string,
    reason: string = 'password_reset',
  ) {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot emit logout to password reset room',
      );
      return;
    }

    this.logger.log(`🔍 Looking for password reset room for email: ${email}`);
    const room = this.passwordResetRooms.get(email.toLowerCase());
    this.logger.log(
      `📊 Password reset room state for ${email}: ${room ? `Found with ${room.size} users` : 'Not found'}`,
    );

    if (room && room.size > 0) {
      try {
        this.logger.log(
          `📡 Emitting forceLogout to password reset room: password_reset:${email.toLowerCase()}`,
        );
        this.logger.log(`📡 Room contains sockets:`, Array.from(room));

        // Emit to the room
        const payload: ForceLogoutPayload = {
          reason,
          message:
            'Your password has been reset. Please log in with your new password.',
          timestamp: new Date().toISOString(),
        };

        this.server
          .to(`password_reset:${email.toLowerCase()}`)
          .emit('forceLogout', payload);

        this.logger.log(
          `✅ Logout emitted to password reset room for email: ${email}`,
        );

        // Clean up the password reset room after successful emission
        this.logger.log(
          `🧹 Cleaning up password reset room for email: ${email}`,
        );
        this.passwordResetRooms.delete(email.toLowerCase());

        // Also remove all sockets from the room
        for (const socketId of room) {
          try {
            this.server
              .in(socketId)
              .socketsLeave(`password_reset:${email.toLowerCase()}`);
          } catch (error) {
            this.logger.warn(
              `Failed to remove socket ${socketId} from password reset room:`,
              error,
            );
          }
        }

        this.logger.log(
          `✅ Password reset room cleaned up for email: ${email}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Failed to emit logout to password reset room for email ${email}:`,
          error,
        );
      }
    } else {
      this.logger.warn(`⚠️ No password reset room found for email: ${email}`);
      this.logger.log(
        `🔍 Available password reset rooms:`,
        Array.from(this.passwordResetRooms.keys()),
      );
    }
  }

  // Method to emit logout event to all connected devices (global logout)
  emitGlobalLogout(reason: string = 'security_event') {
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized, cannot emit global logout',
      );
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

      this.logger.log(
        `Global logout emitted to all devices - reason: ${reason}`,
      );
    } catch (error) {
      this.logger.error(`Failed to emit global logout:`, error);
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

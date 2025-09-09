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
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    isVerified: boolean;
  };
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/auth',
})
export class AuthWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AuthWebSocketGateway.name);
  private readonly verificationRooms = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private readonly pendingVerificationRooms = new Map<string, Set<string>>(); // email -> Set of socketIds
  private readonly passwordResetRooms = new Map<string, Set<string>>(); // email -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.server = server;
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Ensure server is initialized
      if (!this.server) {
        this.logger.error('WebSocket server not initialized');
        client.disconnect();
        return;
      }

      // Extract token from handshake auth
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get('JWT_SECRET'),
          });
          
          client.user = {
            id: payload.sub,
            email: payload.email,
            isVerified: payload.isVerified,
          };
          
          this.logger.log(`Authenticated WebSocket connection for user ${client.user.email}`);
          
          // Join user to their personal room
          await client.join(`user:${client.user.id}`);
          
          // If user is not verified, add them to verification room
          if (!client.user.isVerified) {
            await this.addToVerificationRoom(client.user.id, client.id);
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Invalid token in WebSocket connection: ${errorMessage}`);
          client.disconnect();
          return;
        }
      } else {
        this.logger.log('Anonymous WebSocket connection');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling WebSocket connection: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.logger.log(`WebSocket disconnected for user ${client.user.email}`);
      // Remove from verification room if they were there
      this.removeFromVerificationRoom(client.user.id, client.id);
    } else {
      this.logger.log('Anonymous WebSocket disconnected');
    }
    
    // Remove from all pending verification rooms (for anonymous connections)
    // This is important for cross-browser sync cleanup
    for (const [email, room] of this.pendingVerificationRooms.entries()) {
      if (room.has(client.id)) {
        this.logger.log(`🧹 Cleaning up anonymous client ${client.id} from pending verification room for ${email}`);
        this.removeFromPendingVerificationRoom(email, client.id);
      }
    }

    // Remove from all password reset rooms (for anonymous connections)
    for (const [email, room] of this.passwordResetRooms.entries()) {
      if (room.has(client.id)) {
        this.logger.log(`🧹 Cleaning up anonymous client ${client.id} from password reset room for ${email}`);
        this.removeFromPasswordResetRoom(email, client.id);
      }
    }
  }

  @SubscribeMessage('joinVerificationRoom')
  async handleJoinVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string }
  ) {
    if (client.user && client.user.id === data.userId) {
      await this.addToVerificationRoom(data.userId, client.id);
      client.emit('verificationRoomJoined', { success: true });
    } else {
      client.emit('verificationRoomJoined', { success: false, error: 'Unauthorized' });
    }
  }

  @SubscribeMessage('leaveVerificationRoom')
  async handleLeaveVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string }
  ) {
    if (client.user && client.user.id === data.userId) {
      await this.removeFromVerificationRoom(data.userId, client.id);
      client.emit('verificationRoomLeft', { success: true });
    }
  }

  @SubscribeMessage('joinPendingVerificationRoom')
  async handleJoinPendingVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string }
  ) {
    // Allow anonymous connections to join pending verification rooms
    const email = data.email.toLowerCase();
    this.logger.log(`🔗 User ${client.id} attempting to join pending verification room for email: ${email}`);
    
    await this.addToPendingVerificationRoom(email, client.id);
    client.emit('pendingVerificationRoomJoined', { success: true, email });
    this.logger.log(`✅ User ${client.id} successfully joined pending verification room for email: ${email}`);
    
    // Log current room state
    const room = this.pendingVerificationRooms.get(email);
    this.logger.log(`📊 Pending verification room for ${email} now has ${room?.size || 0} users`);
    
    // Log all current pending verification rooms for debugging
    this.logger.log(`📊 All pending verification rooms:`, this.getRoomStates().pendingVerificationRooms);
  }

  @SubscribeMessage('leavePendingVerificationRoom')
  async handleLeavePendingVerificationRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string }
  ) {
    const email = data.email.toLowerCase();
    this.logger.log(`🔗 User ${client.id} attempting to leave pending verification room for email: ${email}`);
    await this.removeFromPendingVerificationRoom(email, client.id);
    client.emit('pendingVerificationRoomLeft', { success: true, email });
    this.logger.log(`✅ User ${client.id} successfully left pending verification room for email: ${email}`);
  }

  @SubscribeMessage('joinPasswordResetRoom')
  async handleJoinPasswordResetRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string }
  ) {
    // Allow anonymous connections to join password reset rooms
    const email = data.email.toLowerCase();
    this.logger.log(`🔗 User ${client.id} attempting to join password reset room for email: ${email}`);
    
    await this.addToPasswordResetRoom(email, client.id);
    client.emit('passwordResetRoomJoined', { success: true, email });
    this.logger.log(`✅ User ${client.id} successfully joined password reset room for email: ${email}`);
    
    // Log current room state
    const room = this.passwordResetRooms.get(email);
    this.logger.log(`📊 Password reset room for ${email} now has ${room?.size || 0} users`);
  }

  @SubscribeMessage('leavePasswordResetRoom')
  async handleLeavePasswordResetRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { email: string }
  ) {
    const email = data.email.toLowerCase();
    this.logger.log(`🔗 User ${client.id} attempting to leave password reset room for email: ${email}`);
    await this.removeFromPasswordResetRoom(email, client.id);
    client.emit('passwordResetRoomLeft', { success: true, email });
    this.logger.log(`✅ User ${client.id} successfully left password reset room for email: ${email}`);
  }

  private async addToVerificationRoom(userId: string, socketId: string) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot add user to verification room');
      return;
    }

    if (!this.verificationRooms.has(userId)) {
      this.verificationRooms.set(userId, new Set());
    }
    this.verificationRooms.get(userId)!.add(socketId);
    
    // Join the socket to the verification room
    // Use the server's socket adapter to join the room
    try {
      await this.server.in(socketId).socketsJoin(`verification:${userId}`);
      this.logger.log(`User ${userId} added to verification room`);
    } catch (error) {
      this.logger.warn(`Failed to add user ${userId} to verification room:`, error);
    }
  }

  private async removeFromVerificationRoom(userId: string, socketId: string) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot remove user from verification room');
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
        await this.server.in(socketId).socketsLeave(`verification:${userId}`);
        this.logger.log(`User ${userId} removed from verification room`);
      } catch (error) {
        this.logger.warn(`Failed to remove user ${userId} from verification room:`, error);
      }
    }
  }

  private async addToPendingVerificationRoom(email: string, socketId: string) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot add user to pending verification room');
      return;
    }

    if (!this.pendingVerificationRooms.has(email)) {
      this.pendingVerificationRooms.set(email, new Set());
    }
    this.pendingVerificationRooms.get(email)!.add(socketId);
    
    try {
      await this.server.in(socketId).socketsJoin(`pending_verification:${email}`);
      this.logger.log(`User added to pending verification room for email: ${email}`);
    } catch (error) {
      this.logger.warn(`Failed to add user to pending verification room for email ${email}:`, error);
    }
  }

  private async removeFromPendingVerificationRoom(email: string, socketId: string) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot remove user from pending verification room');
      return;
    }

    const room = this.pendingVerificationRooms.get(email);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.pendingVerificationRooms.delete(email);
      }
      
      try {
        await this.server.in(socketId).socketsLeave(`pending_verification:${email}`);
        this.logger.log(`User removed from pending verification room for email: ${email}`);
      } catch (error) {
        this.logger.warn(`Failed to remove user from pending verification room for email ${email}:`, error);
      }
    }
  }

  private async addToPasswordResetRoom(email: string, socketId: string) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot add user to password reset room');
      return;
    }

    if (!this.passwordResetRooms.has(email)) {
      this.passwordResetRooms.set(email, new Set());
    }
    this.passwordResetRooms.get(email)!.add(socketId);
    
    try {
      await this.server.in(socketId).socketsJoin(`password_reset:${email}`);
      this.logger.log(`User added to password reset room for email: ${email}`);
    } catch (error) {
      this.logger.warn(`Failed to add user to password reset room for email ${email}:`, error);
    }
  }

  private async removeFromPasswordResetRoom(email: string, socketId: string) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot remove user from password reset room');
      return;
    }

    const room = this.passwordResetRooms.get(email);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.passwordResetRooms.delete(email);
      }
      
      try {
        await this.server.in(socketId).socketsLeave(`password_reset:${email}`);
        this.logger.log(`User removed from password reset room for email: ${email}`);
      } catch (error) {
        this.logger.warn(`Failed to remove user from password reset room for email ${email}:`, error);
      }
    }
  }

  // Method to emit verification success to all sockets in a user's verification room
  async emitVerificationSuccess(userId: string, userData: any) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot emit verification success');
      return;
    }

    const room = this.verificationRooms.get(userId);
    if (room && room.size > 0) {
      try {
      this.server.to(`verification:${userId}`).emit('emailVerified', {
        success: true,
        user: userData,
        message: 'Email verified successfully. You are now logged in.',
      });
      
      // Also emit to user's personal room
      this.server.to(`user:${userId}`).emit('emailVerified', {
        success: true,
        user: userData,
        message: 'Email verified successfully. You are now logged in.',
      });
      
      this.logger.log(`Verification success emitted to user ${userId}`);
      } catch (error) {
        this.logger.error(`Failed to emit verification success to user ${userId}:`, error);
      }
    }
  }

  // Method to emit verification success to pending verification room (for cross-browser sync)
  async emitVerificationSuccessToPendingRoom(email: string, userData: any, tokens?: any) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot emit verification success to pending room');
      return;
    }

    this.logger.log(`🔍 Looking for pending verification room for email: ${email}`);
    const room = this.pendingVerificationRooms.get(email.toLowerCase());
    this.logger.log(`📊 Pending verification room state for ${email}: ${room ? `Found with ${room.size} users` : 'Not found'}`);
    this.logger.log(`📊 All pending verification rooms before emission:`, this.getRoomStates().pendingVerificationRooms);
    
    if (room && room.size > 0) {
      try {
        this.logger.log(`📡 Emitting emailVerified to pending verification room: pending_verification:${email.toLowerCase()}`);
        this.logger.log(`📡 Room contains sockets:`, Array.from(room));
        
        // Emit to the room
        this.server.to(`pending_verification:${email.toLowerCase()}`).emit('emailVerified', {
          success: true,
          user: userData,
          tokens: tokens, // Include tokens for automatic login
          message: 'Email verified successfully! You are now logged in.',
        });
        
        this.logger.log(`✅ Verification success emitted to pending room for email: ${email} with tokens`);
        
        // Clean up the pending verification room after successful emission
        this.logger.log(`🧹 Cleaning up pending verification room for email: ${email}`);
        this.pendingVerificationRooms.delete(email.toLowerCase());
        
        // Also remove all sockets from the room
        for (const socketId of room) {
          try {
            await this.server.in(socketId).socketsLeave(`pending_verification:${email.toLowerCase()}`);
          } catch (error) {
            this.logger.warn(`Failed to remove socket ${socketId} from pending verification room:`, error);
          }
        }
        
        this.logger.log(`✅ Pending verification room cleaned up for email: ${email}`);
      } catch (error) {
        this.logger.error(`❌ Failed to emit verification success to pending room for email ${email}:`, error);
      }
    } else {
      this.logger.warn(`⚠️ No pending verification room found for email: ${email}`);
      this.logger.log(`🔍 Available pending verification rooms:`, Array.from(this.pendingVerificationRooms.keys()));
    }
  }

  // Method to emit verification failure
  async emitVerificationFailure(userId: string, error: string) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot emit verification failure');
      return;
    }

    const room = this.verificationRooms.get(userId);
    if (room && room.size > 0) {
      try {
      this.server.to(`verification:${userId}`).emit('emailVerificationFailed', {
        success: false,
        error,
      });
      
      this.logger.log(`Verification failure emitted to user ${userId}`);
      } catch (error) {
        this.logger.error(`Failed to emit verification failure to user ${userId}:`, error);
      }
    }
  }

  // Method to emit login success
  async emitLoginSuccess(userId: string, userData: any) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot emit login success');
      return;
    }

    try {
    this.server.to(`user:${userId}`).emit('loginSuccess', {
      success: true,
      user: userData,
    });
    
    this.logger.log(`Login success emitted to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to emit login success to user ${userId}:`, error);
    }
  }


  // Method to broadcast login to all devices (called after successful verification)
  async broadcastLogin(user: any) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot broadcast login');
      return;
    }

    try {
      // Broadcast to all connected clients
      this.server.emit('auth_broadcast', { type: 'login', user });
      this.logger.log(`Login broadcasted to all devices`);
    } catch (error) {
      this.logger.error(`Failed to broadcast login`, error);
    }
  }

  // Method to emit logout event to all user's devices (for password change)
  async emitLogoutToUserDevices(userId: string, reason: string = 'password_changed') {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot emit logout to user devices');
      return;
    }

    try {
      // Emit to user's personal room (all their devices)
      this.server.to(`user:${userId}`).emit('forceLogout', {
        reason,
        message: 'Your password has been changed. Please log in again.',
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(`Logout emitted to all devices for user ${userId} - reason: ${reason}`);
    } catch (error) {
      this.logger.error(`Failed to emit logout to user devices for user ${userId}:`, error);
    }
  }

  // Method to emit logout event to password reset room (for password reset)
  async emitLogoutToPasswordResetRoom(email: string, reason: string = 'password_reset') {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot emit logout to password reset room');
      return;
    }

    this.logger.log(`🔍 Looking for password reset room for email: ${email}`);
    const room = this.passwordResetRooms.get(email.toLowerCase());
    this.logger.log(`📊 Password reset room state for ${email}: ${room ? `Found with ${room.size} users` : 'Not found'}`);
    
    if (room && room.size > 0) {
      try {
        this.logger.log(`📡 Emitting forceLogout to password reset room: password_reset:${email.toLowerCase()}`);
        this.logger.log(`📡 Room contains sockets:`, Array.from(room));
        
        // Emit to the room
        this.server.to(`password_reset:${email.toLowerCase()}`).emit('forceLogout', {
          reason,
          message: 'Your password has been reset. Please log in with your new password.',
          timestamp: new Date().toISOString(),
        });
        
        this.logger.log(`✅ Logout emitted to password reset room for email: ${email}`);
        
        // Clean up the password reset room after successful emission
        this.logger.log(`🧹 Cleaning up password reset room for email: ${email}`);
        this.passwordResetRooms.delete(email.toLowerCase());
        
        // Also remove all sockets from the room
        for (const socketId of room) {
          try {
            await this.server.in(socketId).socketsLeave(`password_reset:${email.toLowerCase()}`);
          } catch (error) {
            this.logger.warn(`Failed to remove socket ${socketId} from password reset room:`, error);
          }
        }
        
        this.logger.log(`✅ Password reset room cleaned up for email: ${email}`);
      } catch (error) {
        this.logger.error(`❌ Failed to emit logout to password reset room for email ${email}:`, error);
      }
    } else {
      this.logger.warn(`⚠️ No password reset room found for email: ${email}`);
      this.logger.log(`🔍 Available password reset rooms:`, Array.from(this.passwordResetRooms.keys()));
    }
  }

  // Method to emit logout event to all connected devices (global logout)
  async emitGlobalLogout(reason: string = 'security_event') {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized, cannot emit global logout');
      return;
    }

    try {
      // Broadcast to all connected clients
      this.server.emit('forceLogout', {
        reason,
        message: 'You have been logged out for security reasons. Please log in again.',
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(`Global logout emitted to all devices - reason: ${reason}`);
    } catch (error) {
      this.logger.error(`Failed to emit global logout:`, error);
    }
  }

  // Debug method to get current room states
  getRoomStates() {
    return {
      verificationRooms: Object.fromEntries(
        Array.from(this.verificationRooms.entries()).map(([userId, sockets]) => [
          userId,
          Array.from(sockets)
        ])
      ),
      pendingVerificationRooms: Object.fromEntries(
        Array.from(this.pendingVerificationRooms.entries()).map(([email, sockets]) => [
          email,
          Array.from(sockets)
        ])
      ),
      passwordResetRooms: Object.fromEntries(
        Array.from(this.passwordResetRooms.entries()).map(([email, sockets]) => [
          email,
          Array.from(sockets)
        ])
      )
    };
  }
}

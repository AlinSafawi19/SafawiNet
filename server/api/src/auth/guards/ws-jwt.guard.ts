import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { isJwtPayload } from '../types/jwt.types';

/**
 * User data interface for WebSocket events
 */
export interface WebSocketUser {
  id: string;
  email: string;
  isVerified: boolean;
}

/**
 * Extended Socket interface with authenticated user information
 */
export interface AuthenticatedSocket extends Socket {
  user: WebSocketUser;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token: string | undefined =
        (client.handshake.auth as { token?: string }).token ||
        (client.handshake.headers.authorization as string)?.replace(
          'Bearer ',
          '',
        );

      if (!token) {
        throw new WsException('Token not provided');
      }

      const jwtSecret: string | undefined =
        this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        throw new WsException('JWT secret not configured');
      }

      const payload: unknown = this.jwtService.verify(token, {
        secret: jwtSecret,
      });

      // Type guard for JWT payload
      if (!isJwtPayload(payload)) {
        throw new WsException('Invalid token payload');
      }

      const { sub, email, verified } = payload;

      // Transform JWT payload to WebSocket user format
      const user: WebSocketUser = {
        id: sub,
        email: email,
        isVerified: verified,
      };

      // Attach user info to socket for later use
      (client as AuthenticatedSocket).user = user;

      return true;
    } catch (err: unknown) {
      if (err instanceof WsException) {
        throw err;
      }
      throw new WsException('Invalid token');
    }
  }
}

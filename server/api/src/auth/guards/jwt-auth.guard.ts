import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/services/prisma.service';
import { Request } from 'express';
import { Role } from '@prisma/client';

// Interface for JWT payload structure
interface JwtPayload {
  sub: string;
  email: string;
  name: string | null;
  verified: boolean;
  roles: Role[];
  refreshTokenId: string;
  iat: number;
  exp: number;
}

// Interface for request with cookies
interface RequestWithCookies extends Request {
  cookies: {
    accessToken?: string;
    [key: string]: string | undefined;
  };
}

// Interface for authenticated request with user properties
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    sub: string;
    email: string;
    name: string | null;
    verified: boolean;
    roles: Role[];
    refreshTokenId: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('🛡️ JWT Guard - canActivate called');

    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      console.log('🛡️ JWT Guard - No token provided');
      throw new UnauthorizedException('No token provided');
    }

    try {
      console.log('🛡️ JWT Guard - Validating token');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      console.log('🛡️ JWT Guard - Token payload:', payload);

      // Check if user exists and is verified
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
          roles: true,
        },
      });

      if (!user) {
        console.log('🛡️ JWT Guard - User not found for ID:', payload.sub);
        throw new UnauthorizedException('User not found');
      }

      if (!user.isVerified) {
        console.log('🛡️ JWT Guard - User not verified:', user.email);
        throw new UnauthorizedException('Email not verified');
      }

      // Validate session against UserSession table
      if (payload.refreshTokenId) {
        const userSession = await this.prisma.userSession.findFirst({
          where: {
            userId: payload.sub,
            refreshTokenId: payload.refreshTokenId,
          },
          select: {
            id: true,
            isCurrent: true,
            lastActiveAt: true,
          },
        });

        if (!userSession) {
          console.log(
            '🛡️ JWT Guard - Session not found for refreshTokenId:',
            payload.refreshTokenId,
          );
          throw new UnauthorizedException('Invalid session');
        }

        if (!userSession.isCurrent) {
          console.log(
            '🛡️ JWT Guard - Session is not current for refreshTokenId:',
            payload.refreshTokenId,
          );
          throw new UnauthorizedException('Session expired');
        }

        // Update session activity
        try {
          await this.prisma.userSession.update({
            where: { id: userSession.id },
            data: { lastActiveAt: new Date() },
          });
          console.log(
            '🔄 JWT Guard - Updated session activity for session:',
            userSession.id,
          );
        } catch (error) {
          console.log(
            '⚠️ JWT Guard - Failed to update session activity:',
            error,
          );
          // Don't fail validation if session update fails
        }
      }

      console.log(
        '🛡️ JWT Guard - Authentication and session validation successful, user:',
        user.email,
      );

      // Attach user to request
      (request as AuthenticatedRequest).user = {
        id: user.id,
        sub: user.id,
        email: user.email,
        name: user.name,
        verified: user.isVerified,
        roles: user.roles,
        refreshTokenId: payload.refreshTokenId,
      };

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log('🛡️ JWT Guard - Token validation failed:', errorMessage);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromRequest(
    request: RequestWithCookies,
  ): string | undefined {
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 JWT Guard - Request cookies:', request?.cookies);
      console.log('🔍 JWT Guard - Request headers:', request?.headers);
    }

    // First try to extract from cookies
    if (request?.cookies?.accessToken) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 JWT Guard - Token found in cookies');
      }
      return request.cookies.accessToken;
    }

    // Fallback to Authorization header
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 JWT Guard - Token found in Authorization header');
      }
      return token;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 JWT Guard - No token found in cookies or headers');
    }
    return undefined;
  }
}

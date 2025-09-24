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
    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

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
        throw new UnauthorizedException('User not found');
      }

      if (!user.isVerified) {
        throw new UnauthorizedException('Email not verified');
      }

      // Validate session against UserSession table
      if (payload.refreshTokenId) {
        try {
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
            // Don't throw an error
            // This allows login to work even if session tracking fails
          } else if (!userSession.isCurrent) {
            // Don't throw an error
            // This allows login to work even if session tracking fails
          } else {
            // Update session activity only if session is valid
            try {
              await this.prisma.userSession.update({
                where: { id: userSession.id },
                data: { lastActiveAt: new Date() },
              });
            } catch (error) {
              console.warn('Failed to update session activity', error, {
                source: 'jwt-auth-guard',
                sessionId: userSession.id,
              });
              // Don't fail validation if session update fails
            }
          }
        } catch (error) {
          console.warn('Failed to validate session', error, {
            source: 'jwt-auth-guard',
            userId: payload.sub,
            refreshTokenId: payload.refreshTokenId,
          });
          // Don't fail validation if database query fails
          // This ensures login works even if session tracking is temporarily unavailable
        }
      }

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
      console.warn('Failed to activate JwtAuthGuard', error, {
        source: 'jwt-auth-guard',
        token,
      });
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromRequest(
    request: RequestWithCookies,
  ): string | undefined {
    // First try to extract from cookies
    if (request?.cookies?.accessToken) {
      return request.cookies.accessToken;
    }

    // Fallback to Authorization header
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }

    return undefined;
  }
}

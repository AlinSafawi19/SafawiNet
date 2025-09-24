import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';
import { SessionCacheService } from '../../common/services/session-cache.service';
import { Request } from 'express';
import { User, Role } from '@prisma/client';
import { JwtPayload } from '../types/auth.types';

// Type for request object with cookies
interface RequestWithCookies extends Request {
  cookies: {
    accessToken?: string;
    [key: string]: string | undefined;
  };
}

// Type for user data returned from Prisma query
type UserWithRoles = Pick<User, 'id' | 'email' | 'name' | 'isVerified'> & {
  roles: Role[];
};

// Type for user session data returned from Prisma query
//type UserSessionData = Pick<UserSession, 'id' | 'isCurrent' | 'lastActiveAt'>;

// Type for the return value of validate method
export interface ValidatedUser {
  sub: string;
  email: string;
  name: string | null;
  verified: boolean;
  roles: Role[];
  refreshTokenId?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sessionCacheService: SessionCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to extract from cookies
        (request: RequestWithCookies): string | null => {
          if (request?.cookies?.accessToken) {
            return request.cookies.accessToken;
          }
          return null;
        },
        // Fallback to Authorization header for backward compatibility
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    // Check if user still exists and is verified
    const user: UserWithRoles | null = await this.prisma.user.findUnique({
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

    // Validate session using Redis cache first, fallback to database
    if (payload.refreshTokenId) {
      try {
        const cachedSession = await this.sessionCacheService.getSession(
          payload.sub,
          payload.refreshTokenId,
        );

        if (cachedSession) {
          // Session found in cache - update activity asynchronously
          if (cachedSession.isCurrent) {
            // Update session activity in background (non-blocking)
            this.sessionCacheService
              .updateSessionActivity(payload.sub, payload.refreshTokenId)
              .catch((error) => {
                console.warn(
                  'Failed to update session activity in cache',
                  error,
                  {
                    source: 'jwt-strategy',
                    userId: payload.sub,
                    refreshTokenId: payload.refreshTokenId,
                  },
                );
              });
          }
        }
      } catch (error) {
        console.warn('Failed to validate session via cache', error, {
          source: 'jwt-strategy',
          userId: payload.sub,
          refreshTokenId: payload.refreshTokenId,
        });
        // Don't fail validation if cache/database query fails
        // This ensures login works even if session tracking is temporarily unavailable
      }
    }

    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      verified: user.isVerified,
      roles: user.roles,
      refreshTokenId: payload.refreshTokenId,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}

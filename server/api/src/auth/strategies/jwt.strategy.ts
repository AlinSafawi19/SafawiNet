import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';
import { Request } from 'express';
import { User, UserSession, Role } from '@prisma/client';
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
type UserSessionData = Pick<UserSession, 'id' | 'isCurrent' | 'lastActiveAt'>;

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
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
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

    // Validate session against UserSession table
    if (payload.refreshTokenId) {
      try {
        const userSession: UserSessionData | null =
          await this.prisma.userSession.findFirst({
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
            this.logger.warn('Failed to update session activity', error, {
              source: 'jwt-strategy',
              sessionId: userSession.id,
            });
            // Don't fail validation if session update fails
          }
        }
      } catch (error) {
        this.logger.warn('Failed to validate session', error, {
          source: 'jwt-strategy',
          userId: payload.sub,
          refreshTokenId: payload.refreshTokenId,
        });
        // Don't fail validation if database query fails
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

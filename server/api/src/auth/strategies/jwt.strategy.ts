import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    console.log('🔐 JWT Strategy - validate called with payload:', payload);
    console.log(
      '🔐 JWT Strategy - iat field:',
      payload.iat,
      'type:',
      typeof payload.iat,
    );
    console.log(
      '🔐 JWT Strategy - exp field:',
      payload.exp,
      'type:',
      typeof payload.exp,
    );

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

    console.log('🔐 JWT Strategy - user found:', user);

    if (!user) {
      console.log('❌ JWT Strategy - User not found for ID:', payload.sub);
      throw new UnauthorizedException('User not found');
    }

    if (!user.isVerified) {
      console.log('❌ JWT Strategy - User not verified:', user.email);
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
          console.log(
            '❌ JWT Strategy - Session not found for refreshTokenId:',
            payload.refreshTokenId,
          );
          // Instead of throwing an error, log and continue without session validation
          // This allows login to work even if session tracking fails
          console.log(
            '⚠️ JWT Strategy - Continuing without session validation due to missing session',
          );
        } else if (!userSession.isCurrent) {
          console.log(
            '❌ JWT Strategy - Session is not current for refreshTokenId:',
            payload.refreshTokenId,
          );
          // Instead of throwing an error, log and continue without session validation
          console.log(
            '⚠️ JWT Strategy - Continuing without session validation due to inactive session',
          );
        } else {
          // Update session activity only if session is valid
          try {
            await this.prisma.userSession.update({
              where: { id: userSession.id },
              data: { lastActiveAt: new Date() },
            });
            console.log(
              '🔄 JWT Strategy - Updated session activity for session:',
              userSession.id,
            );
          } catch (error: unknown) {
            console.log(
              '⚠️ JWT Strategy - Failed to update session activity:',
              error,
            );
            // Don't fail validation if session update fails
          }
        }
      } catch (error: unknown) {
        console.log(
          '⚠️ JWT Strategy - Database error during session validation:',
          error,
        );
        // Don't fail validation if database query fails
        // This ensures login works even if session tracking is temporarily unavailable
      }
    } else {
      console.log(
        'ℹ️ JWT Strategy - No refreshTokenId in payload, skipping session validation',
      );
    }

    console.log(
      '✅ JWT Strategy - User and session validated successfully:',
      user.email,
    );

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

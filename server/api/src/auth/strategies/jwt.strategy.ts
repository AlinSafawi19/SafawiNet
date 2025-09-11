import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  verified: boolean;
  roles: string[];
  refreshTokenId: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to extract from cookies
        (request) => {
          if (request?.cookies?.accessToken) {
            return request.cookies.accessToken;
          }
          return null;
        },
        // Fallback to Authorization header for backward compatibility
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
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
          '❌ JWT Strategy - Session not found for refreshTokenId:',
          payload.refreshTokenId,
        );
        throw new UnauthorizedException('Invalid session');
      }

      if (!userSession.isCurrent) {
        console.log(
          '❌ JWT Strategy - Session is not current for refreshTokenId:',
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
          '🔄 JWT Strategy - Updated session activity for session:',
          userSession.id,
        );
      } catch (error) {
        console.log(
          '⚠️ JWT Strategy - Failed to update session activity:',
          error,
        );
        // Don't fail validation if session update fails
      }
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

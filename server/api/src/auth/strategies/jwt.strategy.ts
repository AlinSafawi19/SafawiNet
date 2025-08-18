import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  verified: boolean;
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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    console.log('🔐 JWT Strategy - validate called with payload:', payload);
    
    // Check if user still exists and is verified
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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

    console.log('✅ JWT Strategy - User validated successfully:', user.email);
    
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      verified: user.isVerified,
    };
  }
}

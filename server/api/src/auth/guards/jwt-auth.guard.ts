import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class JwtAuthGuard {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('🛡️ JWT Guard - canActivate called');
    
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      console.log('🛡️ JWT Guard - Route is public, allowing access');
      return true;
    }

    console.log('🛡️ JWT Guard - Route requires authentication');
    
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      console.log('🛡️ JWT Guard - No token found, throwing UnauthorizedException');
      throw new UnauthorizedException('No token provided');
    }

    try {
      console.log('🛡️ JWT Guard - Validating token');
      const payload = await this.jwtService.verifyAsync(token);
      console.log('🛡️ JWT Guard - Token payload:', payload);
      
      // Check if user exists and is verified
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        console.log('🛡️ JWT Guard - User not found for ID:', payload.sub);
        throw new UnauthorizedException('User not found');
      }

      if (!user.isVerified) {
        console.log('🛡️ JWT Guard - User not verified:', user.email);
        throw new UnauthorizedException('Email not verified');
      }

      console.log('🛡️ JWT Guard - Authentication successful, user:', user.email);
      
      // Attach user to request
      request.user = {
        id: user.id,
        sub: user.id,
        email: user.email,
        name: user.name,
        verified: user.isVerified,
      };
      
      return true;
    } catch (error) {
      console.log('🛡️ JWT Guard - Token validation failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

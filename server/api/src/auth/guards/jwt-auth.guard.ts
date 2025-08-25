import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('🛡️ JWT Guard - canActivate called');

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      console.log('🛡️ JWT Guard - No token provided');
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('🛡️ JWT Guard - Token validation failed:', errorMessage);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromRequest(request: any): string | undefined {
    // First try to extract from cookies
    if (request?.cookies?.accessToken) {
      return request.cookies.accessToken;
    }
    
    // Fallback to Authorization header
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

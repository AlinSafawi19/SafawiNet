import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(_req: Request, res: Response, next: NextFunction) {
    // Content Security Policy
    const cspDirectives = this.configService.get<string>(
      'CSP_DIRECTIVES',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    );
    res.setHeader('Content-Security-Policy', cspDirectives);

    // HTTP Strict Transport Security
    const hstsMaxAge = this.configService.get<string>(
      'HSTS_MAX_AGE',
      '31536000',
    );
    res.setHeader(
      'Strict-Transport-Security',
      `max-age=${hstsMaxAge}; includeSubDomains; preload`,
    );

    // Referrer Policy
    const referrerPolicy = this.configService.get<string>(
      'REFERRER_POLICY',
      'strict-origin-when-cross-origin',
    );
    res.setHeader('Referrer-Policy', referrerPolicy);

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');

    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );

    next();
  }
}

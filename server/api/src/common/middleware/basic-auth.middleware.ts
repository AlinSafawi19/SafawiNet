import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Only apply basic auth in staging environment
    if (process.env.NODE_ENV !== 'staging') {
      return next();
    }

    // Skip basic auth for health checks
    if (req.path === '/health') {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Staging Environment"');
      throw new UnauthorizedException('Basic authentication required');
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    const expectedUsername = process.env.BASIC_AUTH_USERNAME;
    const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

    if (!expectedUsername || !expectedPassword) {
      console.warn('Basic auth credentials not configured for staging');
      return next();
    }

    if (username === expectedUsername && password === expectedPassword) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Staging Environment"');
    throw new UnauthorizedException('Invalid credentials');
  }
}

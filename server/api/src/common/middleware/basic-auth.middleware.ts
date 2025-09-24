import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    // Basic auth is disabled - only development and production environments are supported
    return next();
  }
}

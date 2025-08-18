import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { PinoLoggerService } from '../services/logger.service';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private logger: PinoLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] as string || randomUUID();
    
    // Add request ID to request object
    (req as any).requestId = requestId;
    
    // Add request ID to response headers
    res.setHeader('x-request-id', requestId);
    
    // Set logger context for this request
    this.logger.setContext(requestId);
    
    next();
  }
}

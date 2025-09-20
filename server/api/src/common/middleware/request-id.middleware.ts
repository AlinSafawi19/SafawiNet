import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    // Add request ID to request object
    (req as Request & { requestId: string }).requestId = requestId;

    // Add request ID to response headers
    res.setHeader('x-request-id', requestId);

    next();
  }
}

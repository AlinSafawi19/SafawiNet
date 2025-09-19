import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, url, ip } = req;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const requestId = (req as any).requestId;

    // Log incoming request
    this.loggerService.http('Incoming API Request', {
      url,
      ipAddress: ip,
      userAgent,
      requestId,
      source: 'api',
      metadata: {
        method,
        query: req.query,
        body: this.sanitizeBody(req.body),
        headers: this.sanitizeHeaders(req.headers),
      },
    });

    // Override res.end to log response
    const originalEnd = res.end;
    const loggerService = this.loggerService;
    res.end = function (chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Log outgoing response
      loggerService.http('API Response', {
        url,
        ipAddress: ip,
        userAgent,
        requestId,
        source: 'api',
        metadata: {
          method,
          statusCode,
          duration,
          responseSize: chunk ? Buffer.byteLength(chunk, encoding) : 0,
        },
      });

      // Call original end method and return its result
      return originalEnd.call(res, chunk, encoding);
    };

    next();
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;
    
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

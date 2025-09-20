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
    const originalEnd = res.end.bind(res) as (
      chunk?: any,
      encoding?: BufferEncoding,
      cb?: () => void,
    ) => Response;
    const loggerService = this.loggerService;
    res.end = function (
      chunk?: any,
      encodingOrCb?: BufferEncoding | (() => void),
      cb?: () => void,
    ): Response {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Determine actual encoding and callback
      const encoding =
        typeof encodingOrCb === 'string' ? encodingOrCb : undefined;
      const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb;

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
          responseSize: chunk
            ? Buffer.byteLength(
                chunk as
                  | string
                  | Buffer
                  | ArrayBuffer
                  | SharedArrayBuffer
                  | NodeJS.ArrayBufferView,
                encoding,
              )
            : 0,
        },
      });

      // Call original end method and return its result
      return originalEnd(chunk, encoding, callback);
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

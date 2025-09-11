import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as pino from 'pino';
import { SentryService } from './sentry.service';

@Injectable({ scope: Scope.TRANSIENT })
export class PinoLoggerService implements LoggerService {
  private readonly logger: pino.Logger;
  private requestId?: string;
  private userId?: string;

  constructor(private sentryService: SentryService) {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      mixin() {
        return {
          service: 'safawinet-api',
          environment: process.env.NODE_ENV || 'development',
        };
      },
    });
  }

  // Set context for the current request
  setContext(requestId: string, userId?: string) {
    this.requestId = requestId;
    this.userId = userId;

    // Set Sentry context if available
    if (userId) {
      this.sentryService.setUser({ id: userId });
    }
    if (requestId) {
      this.sentryService.setTag('requestId', requestId);
    }
  }

  log(message: any, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);

    // Send to Sentry if it's an error object
    if (message instanceof Error) {
      this.sentryService.captureException(message, { context });
    } else if (typeof message === 'string') {
      this.sentryService.captureMessage(message, 'error', { context });
    }
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, message);
  }

  // Get the underlying Pino logger for advanced usage
  getLogger(): pino.Logger {
    return this.logger;
  }

  // Log with additional metadata
  logWithMetadata(
    message: string,
    metadata: Record<string, any>,
    context?: string,
  ) {
    this.logger.info({ context, ...metadata }, message);
  }

  // Log performance metrics
  logPerformance(
    route: string,
    method: string,
    duration: number,
    statusCode: number,
  ) {
    this.logger.info(
      {
        context: 'Performance',
        route,
        method,
        duration,
        statusCode,
        performance: true,
      },
      `Request completed: ${method} ${route} in ${duration}ms`,
    );
  }

  // Log security events
  logSecurityEvent(event: string, details: Record<string, any>) {
    this.logger.warn(
      {
        context: 'Security',
        securityEvent: true,
        ...details,
      },
      `Security event: ${event}`,
    );
  }

  // Log database queries (for performance monitoring)
  logDatabaseQuery(query: string, duration: number, table?: string) {
    this.logger.debug(
      {
        context: 'Database',
        query,
        duration,
        table,
        dbQuery: true,
      },
      `Database query executed in ${duration}ms`,
    );
  }
}

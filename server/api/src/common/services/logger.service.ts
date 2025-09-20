import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

export interface LogContext {
  userId?: string;
  requestId?: string;
  url?: string;
  userAgent?: string;
  ipAddress?: string;
  source?: 'server' | 'client' | 'api' | 'auth' | 'database';
  level?: 'error' | 'warning' | 'warn' | 'info' | 'debug';
  metadata?: Record<string, any>;
}

@Injectable()
export class LoggerService implements OnModuleInit {
  private logger!: winston.Logger;
  private errorLogger!: winston.Logger;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const logDir = this.configService.get<string>('LOG_DIR', './logs');
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Custom format for structured logging
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const logEntry = {
          timestamp,
          level,
          message,
          ...(stack && typeof stack === 'string' ? { stack } : {}),
          ...(typeof meta === 'object' && meta !== null ? meta : {}),
        };
        return JSON.stringify(logEntry);
      }),
    );

    // General logger for all logs
    this.logger = winston.createLogger({
      level: environment === 'production' ? 'info' : 'debug',
      format: logFormat,
      defaultMeta: { service: 'safawinet-api' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        // Daily rotate file for all logs
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat,
        }),
      ],
    });

    // Dedicated error logger
    this.errorLogger = winston.createLogger({
      level: 'error',
      format: logFormat,
      defaultMeta: { service: 'safawinet-api', type: 'error' },
      transports: [
        // Console for errors
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        // Daily rotate file for errors only
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'errors-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d', // Keep error logs longer
          format: logFormat,
        }),
      ],
    });
  }

  // Log error with full context
  error(message: string, error?: Error, context?: LogContext): void {
    const logData = {
      ...context,
      ...(error && {
        stack: error.stack,
        name: error.name,
        message: error.message,
      }),
    };

    this.errorLogger.error(message, logData);
    this.logger.error(message, logData);
  }

  // Log warning
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  // Log info
  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  // Log debug
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  // Log HTTP requests
  http(message: string, context?: LogContext): void {
    this.logger.info(message, { ...context, type: 'http' });
  }

  // Log authentication events
  auth(message: string, context?: LogContext): void {
    this.logger.info(message, { ...context, type: 'auth' });
  }

  // Log database operations
  database(message: string, context?: LogContext): void {
    this.logger.info(message, { ...context, type: 'database' });
  }

  // Log client-side errors received via API
  clientError(message: string, context?: LogContext): void {
    this.errorLogger.error(message, { ...context, source: 'client' });
    this.logger.error(message, { ...context, source: 'client' });
  }

  // Get logger instance for custom usage
  getLogger(): winston.Logger {
    return this.logger;
  }

  // Get error logger instance
  getErrorLogger(): winston.Logger {
    return this.errorLogger;
  }

  // Log with metadata and custom type
  logWithMetadata(message: string, context: LogContext, type?: string): void {
    const logData = {
      ...context,
      ...(type && { type }),
    };

    // Use appropriate log level based on context level
    const level = context.level || 'info';
    switch (level) {
      case 'error':
        this.error(message, undefined, logData);
        break;
      case 'warning':
      case 'warn':
        this.warn(message, logData);
        break;
      case 'debug':
        this.debug(message, logData);
        break;
      case 'info':
      default:
        this.info(message, logData);
        break;
    }
  }
}

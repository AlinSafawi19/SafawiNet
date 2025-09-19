/**
 * Client-side Logger Service
 * Simple logging service for Next.js API routes and client-side code
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogContext {
  component?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

class ClientLoggerService {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    return levels[level] <= levels[this.logLevel];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);
    // Use appropriate console method based on level
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'debug':
        console.debug(formattedMessage);
        break;
    }

    // In development, also log to console with color coding
    if (this.isDevelopment) {
      const colorCode = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m', // Yellow
        info: '\x1b[36m', // Cyan
        debug: '\x1b[90m', // Gray
      }[level];
      console.log(`${colorCode}${formattedMessage}\x1b[0m`);
    }
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  // Convenience method for API routes
  logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration?: number,
    context?: LogContext
  ): void {
    const message = `${method} ${path} - ${statusCode}${
      duration ? ` (${duration}ms)` : ''
    }`;
    const level =
      statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    this.log(level, message, { ...context, apiRequest: true });
  }

  // Log client-side errors
  logClientError(error: Error, context?: LogContext): void {
    this.error(`Client Error: ${error.message}`, {
      ...context,
      stack: error.stack,
      name: error.name,
    });
  }

  // Log security events
  logSecurityEvent(
    event: string,
    details: Record<string, any>,
    context?: LogContext
  ): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      securityEvent: true,
      ...details,
    });
  }
}

// Export singleton instance
export const logger = new ClientLoggerService();
export default logger;

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>(
      'SENTRY_ENVIRONMENT',
      'development',
    );

    if (!dsn) {
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
        beforeSend(event) {
          // Filter out health check and metrics endpoints
          if (
            event.request?.url?.includes('/health') ||
            event.request?.url?.includes('/metrics')
          ) {
            return null;
          }
          return event;
        },
      });
    } catch (error) {
      console.warn('Failed to initialize Sentry', error, {
        source: 'sentry',
      });
    }
  }

  // Capture exceptions
  captureException(exception: Error, context?: Record<string, any>) {
    Sentry.captureException(exception, { extra: context });
  }

  // Capture messages
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: Record<string, any>,
  ): void {
    Sentry.captureMessage(message, { level, extra: context });
  }

  // Set user context
  setUser(user: { id: string; email?: string; username?: string }) {
    Sentry.setUser(user);
  }

  // Set tag
  setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }

  // Set extra context
  setExtra(key: string, value: any) {
    Sentry.setExtra(key, value);
  }
}

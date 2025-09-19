import { clientLogger } from '../services/logger.service';

export const logError = (
  message: string,
  error?: Error,
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }
) => {
  clientLogger.error(message, error, context);
};

export const logWarning = (
  message: string,
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }
) => {
  clientLogger.warn(message, context);
};

export const logInfo = (
  message: string,
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }
) => {
  clientLogger.info(message, context);
};

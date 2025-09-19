interface LogContext {
  userId?: string;
  url?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  component?: string;
  action?: string;
}

interface ClientErrorLog {
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

class ClientLogger {
  private isEnabled: boolean = true;
  private apiEndpoint: string = '/api/logs';
  private logQueue: ClientErrorLog[] = [];
  private maxQueueSize: number = 50;
  private flushInterval: number = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Only enable logging in production or when explicitly enabled
    this.isEnabled = process.env.NODE_ENV === 'production' || 
                    localStorage.getItem('debug-logging') === 'true';
    
    // Start periodic flush
    this.startFlushTimer();
    
    // Flush logs before page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private async sendToServer(log: ClientErrorLog): Promise<void> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log),
      });

      if (!response.ok) {
        console.warn('Failed to send log to server:', response.status);
      }
    } catch (error) {
      console.warn('Error sending log to server:', error);
    }
  }

  private addToQueue(log: ClientErrorLog): void {
    if (!this.isEnabled) return;

    this.logQueue.push(log);

    // If queue is full, remove oldest logs
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue.shift();
    }

    // For errors, flush immediately
    if (log.level === 'error') {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    // Send logs in parallel
    await Promise.all(
      logsToSend.map(log => this.sendToServer(log))
    );
  }

  private createLogEntry(
    level: 'error' | 'warning' | 'info' | 'debug',
    message: string,
    context?: LogContext,
    error?: Error
  ): ClientErrorLog {
    return {
      level,
      message,
      stack: error?.stack,
      url: context?.url || window.location.href,
      userAgent: context?.userAgent || navigator.userAgent,
      metadata: {
        ...context?.metadata,
        component: context?.component,
        action: context?.action,
        userId: context?.userId,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Public logging methods
  error(message: string, error?: Error, context?: LogContext): void {
    console.error(message, error, context);
    
    const logEntry = this.createLogEntry('error', message, context, error);
    this.addToQueue(logEntry);
  }

  warn(message: string, context?: LogContext): void {
    console.warn(message, context);
    
    const logEntry = this.createLogEntry('warning', message, context);
    this.addToQueue(logEntry);
  }

  info(message: string, context?: LogContext): void {
    console.info(message, context);
    
    const logEntry = this.createLogEntry('info', message, context);
    this.addToQueue(logEntry);
  }

  debug(message: string, context?: LogContext): void {
    console.debug(message, context);
    
    const logEntry = this.createLogEntry('debug', message, context);
    this.addToQueue(logEntry);
  }

  // Enable/disable logging
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('debug-logging', enabled.toString());
  }

  // Force flush logs
  async forceFlush(): Promise<void> {
    await this.flush();
  }

  // Get current queue size
  getQueueSize(): number {
    return this.logQueue.length;
  }
}

// Create singleton instance
export const clientLogger = new ClientLogger();

// Export the class for testing
export { ClientLogger };

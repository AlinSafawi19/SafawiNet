import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

export interface WebSocketMetrics {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  messagesPerSecond: number;
  averageConnectionDuration: number;
  roomCounts: {
    verification: number;
    pendingVerification: number;
    passwordReset: number;
  };
  rateLimitViolations: {
    connection: number;
    message: number;
    auth: number;
  };
  errorCounts: {
    connectionErrors: number;
    messageErrors: number;
    authErrors: number;
  };
  memoryUsage: {
    rooms: number;
    connections: number;
    rateLimits: number;
  };
}

export interface ConnectionMetrics {
  socketId: string;
  userId?: string;
  email?: string;
  connectedAt: Date;
  lastActivity: Date;
  messageCount: number;
  roomMemberships: string[];
  isActive: boolean;
}

@Injectable()
export class WebSocketMonitoringService {
  private metrics: WebSocketMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    messagesPerSecond: 0,
    averageConnectionDuration: 0,
    roomCounts: {
      verification: 0,
      pendingVerification: 0,
      passwordReset: 0,
    },
    rateLimitViolations: {
      connection: 0,
      message: 0,
      auth: 0,
    },
    errorCounts: {
      connectionErrors: 0,
      messageErrors: 0,
      authErrors: 0,
    },
    memoryUsage: {
      rooms: 0,
      connections: 0,
      rateLimits: 0,
    },
  };

  private connectionMetrics = new Map<string, ConnectionMetrics>();
  private messageCounts: number[] = []; // Last 60 seconds of message counts
  private lastMetricsUpdate = Date.now();
  private metricsUpdateInterval: NodeJS.Timeout;

  constructor(private readonly logger: LoggerService) {
    // Update metrics every 5 seconds
    this.metricsUpdateInterval = setInterval(() => {
      this.updateMetrics();
    }, 5000);
  }

  /**
   * Record a new connection
   */
  recordConnection(socketId: string, userId?: string, email?: string): void {
    this.connectionMetrics.set(socketId, {
      socketId,
      userId,
      email,
      connectedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      roomMemberships: [],
      isActive: true,
    });

    this.metrics.totalConnections++;
    this.metrics.activeConnections++;
  }

  /**
   * Record a connection disconnect
   */
  recordDisconnection(socketId: string): void {
    const connection = this.connectionMetrics.get(socketId);
    if (connection) {
      connection.isActive = false;
      this.metrics.activeConnections = Math.max(
        0,
        this.metrics.activeConnections - 1,
      );

      // Calculate connection duration
      const duration = Date.now() - connection.connectedAt.getTime();
      this.updateAverageConnectionDuration(duration);
    }
  }

  /**
   * Record a message
   */
  recordMessage(socketId: string): void {
    const connection = this.connectionMetrics.get(socketId);
    if (connection) {
      connection.messageCount++;
      connection.lastActivity = new Date();
    }

    this.metrics.totalMessages++;
    this.messageCounts.push(Date.now());
  }

  /**
   * Record a rate limit violation
   */
  recordRateLimitViolation(type: 'connection' | 'message' | 'auth'): void {
    this.metrics.rateLimitViolations[type]++;
  }

  /**
   * Record an error
   */
  recordError(type: 'connection' | 'message' | 'auth'): void {
    this.metrics.errorCounts[`${type}Errors`]++;
  }

  /**
   * Update room counts
   */
  updateRoomCounts(counts: {
    verification: number;
    pendingVerification: number;
    passwordReset: number;
  }): void {
    this.metrics.roomCounts = counts;
  }

  /**
   * Update memory usage
   */
  updateMemoryUsage(usage: {
    rooms: number;
    connections: number;
    rateLimits: number;
  }): void {
    this.metrics.memoryUsage = usage;
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics[] {
    return Array.from(this.connectionMetrics.values());
  }

  /**
   * Get active connections
   */
  getActiveConnections(): ConnectionMetrics[] {
    return Array.from(this.connectionMetrics.values()).filter(
      (conn) => conn.isActive,
    );
  }

  /**
   * Get connection by socket ID
   */
  getConnection(socketId: string): ConnectionMetrics | undefined {
    return this.connectionMetrics.get(socketId);
  }

  /**
   * Update room membership for a connection
   */
  updateRoomMembership(
    socketId: string,
    roomType: string,
    isJoining: boolean,
  ): void {
    const connection = this.connectionMetrics.get(socketId);
    if (connection) {
      const roomKey = `${roomType}:${socketId}`;

      if (isJoining) {
        if (!connection.roomMemberships.includes(roomKey)) {
          connection.roomMemberships.push(roomKey);
        }
      } else {
        connection.roomMemberships = connection.roomMemberships.filter(
          (room) => room !== roomKey,
        );
      }
    }
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections(maxInactiveTime: number = 30 * 60 * 1000): void {
    const now = Date.now();
    const inactiveConnections: string[] = [];

    for (const [socketId, connection] of this.connectionMetrics.entries()) {
      if (connection.isActive) {
        const timeSinceActivity = now - connection.lastActivity.getTime();
        if (timeSinceActivity > maxInactiveTime) {
          inactiveConnections.push(socketId);
        }
      }
    }

    inactiveConnections.forEach((socketId) => {
      this.recordDisconnection(socketId);
      this.connectionMetrics.delete(socketId);
    });

    if (inactiveConnections.length > 0) {
      this.logger.debug(
        `Cleaned up ${inactiveConnections.length} inactive connections`,
      );
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const now = Date.now();

    // Update messages per second
    this.updateMessagesPerSecond(now);

    // Clean up old message counts
    this.messageCounts = this.messageCounts.filter(
      (timestamp) => now - timestamp < 60000,
    );

    // Clean up inactive connections
    this.cleanupInactiveConnections();

    this.lastMetricsUpdate = now;
  }

  /**
   * Update messages per second
   */
  private updateMessagesPerSecond(now: number): void {
    const oneSecondAgo = now - 1000;
    const recentMessages = this.messageCounts.filter(
      (timestamp) => timestamp > oneSecondAgo,
    );
    this.metrics.messagesPerSecond = recentMessages.length;
  }

  /**
   * Update average connection duration
   */
  private updateAverageConnectionDuration(duration: number): void {
    const totalConnections = this.metrics.totalConnections;
    if (totalConnections > 0) {
      this.metrics.averageConnectionDuration =
        (this.metrics.averageConnectionDuration * (totalConnections - 1) +
          duration) /
        totalConnections;
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    health: 'good' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let health: 'good' | 'warning' | 'critical' = 'good';

    // Check connection health
    if (this.metrics.activeConnections > 1000) {
      issues.push('High number of active connections');
      recommendations.push('Consider implementing connection pooling');
      health = 'warning';
    }

    // Check message rate
    if (this.metrics.messagesPerSecond > 100) {
      issues.push('High message rate detected');
      recommendations.push('Review rate limiting configuration');
      health = 'warning';
    }

    // Check error rates
    const totalErrors = Object.values(this.metrics.errorCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (totalErrors > 100) {
      issues.push('High error rate detected');
      recommendations.push(
        'Investigate error sources and improve error handling',
      );
      health = 'critical';
    }

    // Check rate limit violations
    const totalViolations = Object.values(
      this.metrics.rateLimitViolations,
    ).reduce((sum, count) => sum + count, 0);
    if (totalViolations > 50) {
      issues.push('High rate limit violation rate');
      recommendations.push('Review rate limiting thresholds');
      health = 'warning';
    }

    // Check memory usage
    const totalMemory = Object.values(this.metrics.memoryUsage).reduce(
      (sum, usage) => sum + usage,
      0,
    );
    if (totalMemory > 10000) {
      issues.push('High memory usage detected');
      recommendations.push('Implement memory cleanup and optimization');
      health = 'warning';
    }

    return { health, issues, recommendations };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      totalMessages: 0,
      messagesPerSecond: 0,
      averageConnectionDuration: 0,
      roomCounts: {
        verification: 0,
        pendingVerification: 0,
        passwordReset: 0,
      },
      rateLimitViolations: {
        connection: 0,
        message: 0,
        auth: 0,
      },
      errorCounts: {
        connectionErrors: 0,
        messageErrors: 0,
        authErrors: 0,
      },
      memoryUsage: {
        rooms: 0,
        connections: 0,
        rateLimits: 0,
      },
    };
    this.connectionMetrics.clear();
    this.messageCounts = [];
  }

  /**
   * Cleanup on module destruction
   */
  onModuleDestroy(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }
  }
}

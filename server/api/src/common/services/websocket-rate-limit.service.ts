import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Injectable()
export class WebSocketRateLimitService {
  private readonly isProduction: boolean;
  private readonly rateLimits = {
    connection: { limit: 10, ttl: 60000 }, // 10 connections per minute
    message: { limit: 100, ttl: 60000 }, // 100 messages per minute
    auth: { limit: 5, ttl: 60000 }, // 5 auth attempts per minute
  };

  // Adaptive rate limiting
  private readonly adaptiveLimits = new Map<
    string,
    {
      baseLimit: number;
      currentLimit: number;
      lastAdjustment: Date;
      violationCount: number;
    }
  >();

  private readonly slidingWindows = new Map<
    string,
    {
      timestamps: number[];
      limit: number;
      windowSize: number;
    }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  /**
   * Check if a WebSocket connection is allowed based on rate limits
   */
  async checkConnectionLimit(clientId: string): Promise<boolean> {
    if (!this.isProduction) {
      return true; // No rate limiting in non-production environments
    }

    const key = `ws:connection:${clientId}`;
    const current = await this.redisService.get(key);

    if (!current) {
      await this.redisService.set(
        key,
        '1',
        this.rateLimits.connection.ttl / 1000,
      );
      return true;
    }

    const count = parseInt(current, 10);
    if (count >= this.rateLimits.connection.limit) {
      return false;
    }

    await this.redisService.incr(key);
    return true;
  }

  /**
   * Check if a WebSocket message is allowed based on rate limits
   */
  async checkMessageLimit(clientId: string): Promise<boolean> {
    if (!this.isProduction) {
      return true; // No rate limiting in non-production environments
    }

    const key = `ws:message:${clientId}`;
    const current = await this.redisService.get(key);

    if (!current) {
      await this.redisService.set(key, '1', this.rateLimits.message.ttl / 1000);
      return true;
    }

    const count = parseInt(current, 10);
    if (count >= this.rateLimits.message.limit) {
      return false;
    }

    await this.redisService.incr(key);
    return true;
  }

  /**
   * Check if a WebSocket authentication attempt is allowed based on rate limits
   */
  async checkAuthLimit(clientId: string): Promise<boolean> {
    if (!this.isProduction) {
      return true; // No rate limiting in non-production environments
    }

    const key = `ws:auth:${clientId}`;
    const current = await this.redisService.get(key);

    if (!current) {
      await this.redisService.set(key, '1', this.rateLimits.auth.ttl / 1000);
      return true;
    }

    const count = parseInt(current, 10);
    if (count >= this.rateLimits.auth.limit) {
      return false;
    }

    await this.redisService.incr(key);
    return true;
  }

  /**
   * Get remaining rate limit count for a client
   */
  async getRemainingLimit(
    clientId: string,
    type: 'connection' | 'message' | 'auth',
  ): Promise<number> {
    if (!this.isProduction) {
      return 999; // No limits in non-production
    }

    const key = `ws:${type}:${clientId}`;
    const current = await this.redisService.get(key);

    if (!current) {
      return this.rateLimits[type].limit;
    }

    const count = parseInt(current, 10);
    return Math.max(0, this.rateLimits[type].limit - count);
  }

  /**
   * Reset rate limit for a client (useful for testing or manual reset)
   */
  async resetLimit(
    clientId: string,
    type: 'connection' | 'message' | 'auth',
  ): Promise<void> {
    const key = `ws:${type}:${clientId}`;
    await this.redisService.del(key);
  }

  /**
   * Sliding window rate limiting implementation
   */
  private async checkSlidingWindowLimit(
    clientId: string,
    type: string,
    limit: number,
    windowSize: number,
  ): Promise<boolean> {
    const key = `ws:${type}:${clientId}`;
    const now = Date.now();
    const windowStart = now - windowSize;

    // Get existing timestamps from Redis
    const existingData = await this.redisService.get(key);
    let timestamps: number[] = [];

    if (existingData) {
      try {
        timestamps = JSON.parse(existingData);
      } catch (error) {
        timestamps = [];
      }
    }

    // Remove timestamps outside the window
    timestamps = timestamps.filter((timestamp) => timestamp > windowStart);

    // Check if we're within the limit
    if (timestamps.length >= limit) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);

    // Store updated timestamps
    await this.redisService.set(
      key,
      JSON.stringify(timestamps),
      Math.ceil(windowSize / 1000) + 60, // Add 1 minute buffer
    );

    return true;
  }

  /**
   * Adaptive rate limiting - adjusts limits based on client behavior
   */
  private getAdaptiveLimit(
    clientId: string,
    type: 'connection' | 'message' | 'auth',
  ): number {
    const baseLimit = this.rateLimits[type].limit;
    const adaptiveKey = `${clientId}:${type}`;

    if (!this.adaptiveLimits.has(adaptiveKey)) {
      this.adaptiveLimits.set(adaptiveKey, {
        baseLimit,
        currentLimit: baseLimit,
        lastAdjustment: new Date(),
        violationCount: 0,
      });
    }

    const adaptive = this.adaptiveLimits.get(adaptiveKey)!;
    const now = new Date();
    const timeSinceAdjustment =
      now.getTime() - adaptive.lastAdjustment.getTime();

    // Reset adaptive limits every hour
    if (timeSinceAdjustment > 60 * 60 * 1000) {
      adaptive.currentLimit = baseLimit;
      adaptive.violationCount = 0;
      adaptive.lastAdjustment = now;
    }

    return adaptive.currentLimit;
  }

  /**
   * Record a rate limit violation for adaptive limiting
   */
  private recordViolation(
    clientId: string,
    type: 'connection' | 'message' | 'auth',
  ): void {
    const adaptiveKey = `${clientId}:${type}`;

    if (!this.adaptiveLimits.has(adaptiveKey)) {
      this.adaptiveLimits.set(adaptiveKey, {
        baseLimit: this.rateLimits[type].limit,
        currentLimit: this.rateLimits[type].limit,
        lastAdjustment: new Date(),
        violationCount: 0,
      });
    }

    const adaptive = this.adaptiveLimits.get(adaptiveKey)!;
    adaptive.violationCount++;

    // Reduce limit by 20% for each violation, minimum 10% of base limit
    const reductionFactor = Math.min(0.8, 1 - adaptive.violationCount * 0.2);
    adaptive.currentLimit = Math.max(
      Math.floor(adaptive.baseLimit * 0.1),
      Math.floor(adaptive.baseLimit * reductionFactor),
    );
    adaptive.lastAdjustment = new Date();
  }

  /**
   * Enhanced message rate limiting with sliding window
   */
  async checkMessageLimitEnhanced(clientId: string): Promise<boolean> {
    if (!this.isProduction) {
      return true;
    }

    const adaptiveLimit = this.getAdaptiveLimit(clientId, 'message');
    const result = await this.checkSlidingWindowLimit(
      clientId,
      'message',
      adaptiveLimit,
      this.rateLimits.message.ttl,
    );

    if (!result) {
      this.recordViolation(clientId, 'message');
    }

    return result;
  }
}

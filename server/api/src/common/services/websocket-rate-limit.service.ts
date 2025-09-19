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
      await this.redisService.set(key, '1', this.rateLimits.connection.ttl / 1000);
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
  async getRemainingLimit(clientId: string, type: 'connection' | 'message' | 'auth'): Promise<number> {
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
  async resetLimit(clientId: string, type: 'connection' | 'message' | 'auth'): Promise<void> {
    const key = `ws:${type}:${clientId}`;
    await this.redisService.del(key);
  }
}

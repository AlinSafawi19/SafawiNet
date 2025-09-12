import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis!: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://redis:6379',
    );

    const redisOptions: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    this.redis = new Redis(redisUrl, redisOptions);

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
      this.isConnected = true;
    });

    this.redis.on('error', (error: Error) => {
      this.logger.error('Redis connection error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis is ready');
      this.isConnected = true;
    });

    // Connect to Redis
    try {
      await this.redis.connect();
    } catch (error: unknown) {
      this.logger.warn(
        'Failed to connect to Redis, will retry on first operation:',
        error,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis && this.isConnected) {
      try {
        await this.redis.quit();
        this.logger.log('Redis connection closed gracefully');
      } catch (error: unknown) {
        this.logger.error('Error closing Redis connection:', error);
      }
    }
  }

  private async ensureConnection(): Promise<boolean> {
    if (!this.isConnected) {
      try {
        await this.redis.connect();
        this.isConnected = true;
        return true;
      } catch (error: unknown) {
        this.logger.warn('Failed to reconnect to Redis:', error);
        return false;
      }
    }
    return true;
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!(await this.ensureConnection())) {
        return null;
      }
      return await this.redis.get(key);
    } catch (error: unknown) {
      this.logger.error(`Error getting key ${key}:`, error);
      this.isConnected = false;
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        return;
      }
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error: unknown) {
      this.logger.error(`Error setting key ${key}:`, error);
      this.isConnected = false;
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        return;
      }
      await this.redis.del(key);
    } catch (error: unknown) {
      this.logger.error(`Error deleting key ${key}:`, error);
      this.isConnected = false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!(await this.ensureConnection())) {
        return false;
      }
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error: unknown) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      this.isConnected = false;
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      if (!(await this.ensureConnection())) {
        return 0;
      }
      return await this.redis.incr(key);
    } catch (error: unknown) {
      this.logger.error(`Error incrementing key ${key}:`, error);
      this.isConnected = false;
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        return;
      }
      await this.redis.expire(key, seconds);
    } catch (error: unknown) {
      this.logger.error(`Error setting expiry for key ${key}:`, error);
      this.isConnected = false;
    }
  }

  // Get Redis client for advanced operations
  getClient(): Redis {
    return this.redis;
  }

  // Check if Redis is connected
  isRedisConnected(): boolean {
    return this.isConnected;
  }
}

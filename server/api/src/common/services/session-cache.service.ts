import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { PrismaService } from './prisma.service';
import { UserSession } from '@prisma/client';

export interface CachedSessionData {
  id: string;
  userId: string;
  refreshTokenId: string;
  isCurrent: boolean;
  lastActiveAt: string;
  deviceInfo?: {
    deviceFingerprint?: string;
    userAgent?: string;
    ipAddress?: string;
    location?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
  };
}

@Injectable()
export class SessionCacheService {
  private readonly CACHE_TTL = 15 * 60; // 15 minutes (access token lifetime)
  private readonly CACHE_PREFIX = 'session';

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get session from cache first, fallback to database
   */
  async getSession(
    userId: string,
    refreshTokenId: string,
  ): Promise<CachedSessionData | null> {
    const cacheKey = this.getCacheKey(userId, refreshTokenId);

    try {
      // Try Redis cache first
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData) as CachedSessionData;
      }

      const session = await this.getSessionFromDatabase(userId, refreshTokenId);
      if (session) {
        // Cache the session for future requests
        await this.cacheSession(session);
        return this.mapSessionToCacheData(session);
      }

      return null;
    } catch (error) {
      console.warn('Failed to get session from cache', error, {
        userId,
        refreshTokenId,
        source: 'session-cache',
      });
      return null;
    }
  }

  /**
   * Cache a session in Redis
   */
  async cacheSession(session: UserSession): Promise<void> {
    const cacheKey = this.getCacheKey(session.userId, session.refreshTokenId);
    const cacheData = this.mapSessionToCacheData(session);

    try {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(cacheData),
        this.CACHE_TTL,
      );
    } catch (error) {
      console.warn('Failed to cache session', error, {
        userId: session.userId,
        refreshTokenId: session.refreshTokenId,
        source: 'session-cache',
      });
    }
  }

  /**
   * Update session activity in cache
   */
  async updateSessionActivity(
    userId: string,
    refreshTokenId: string,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(userId, refreshTokenId);

    try {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        const sessionData = JSON.parse(cachedData) as CachedSessionData;
        sessionData.lastActiveAt = new Date().toISOString();

        // Update cache with new activity time
        await this.redisService.set(
          cacheKey,
          JSON.stringify(sessionData),
          this.CACHE_TTL,
        );
      }
    } catch (error) {
      console.warn('Failed to update session activity in cache', error, {
        userId,
        refreshTokenId,
        source: 'session-cache',
      });
    }
  }

  /**
   * Invalidate session from cache
   */
  async invalidateSession(
    userId: string,
    refreshTokenId: string,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(userId, refreshTokenId);

    try {
      await this.redisService.del(cacheKey);
    } catch (error) {
      console.warn('Failed to invalidate session from cache', error, {
        userId,
        refreshTokenId,
        source: 'session-cache',
      });
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    try {
      // Get all cached sessions for the user
      const pattern = `${this.CACHE_PREFIX}:${userId}:*`;
      const keys = await this.getKeysByPattern(pattern);

      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.redisService.del(key)));
      }
    } catch (error) {
      console.warn('Failed to invalidate user sessions from cache', error, {
        userId,
        source: 'session-cache',
      });
    }
  }

  /**
   * Warm up cache with active sessions
   */
  async warmUpCache(): Promise<void> {
    try {
      const activeSessions = await this.prisma.userSession.findMany({
        where: {
          isCurrent: true,
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isVerified: true,
              roles: true,
            },
          },
        },
      });

      const cachePromises = activeSessions.map((session) =>
        this.cacheSession(session),
      );
      await Promise.all(cachePromises);
    } catch (error) {
      console.warn('Failed to warm up cache', error, {
        source: 'session-cache',
      });
    }
  }

  /**
   * Get session from database
   */
  private async getSessionFromDatabase(
    userId: string,
    refreshTokenId: string,
  ): Promise<UserSession | null> {
    return this.prisma.userSession.findFirst({
      where: {
        userId,
        refreshTokenId,
        isCurrent: true,
      },
    });
  }

  /**
   * Map database session to cache data format
   */
  private mapSessionToCacheData(session: UserSession): CachedSessionData {
    return {
      id: session.id,
      userId: session.userId,
      refreshTokenId: session.refreshTokenId,
      isCurrent: session.isCurrent,
      lastActiveAt: session.lastActiveAt.toISOString(),
      deviceInfo: {
        deviceFingerprint: session.deviceFingerprint || undefined,
        userAgent: session.userAgent || undefined,
        ipAddress: session.ipAddress || undefined,
        location: session.location || undefined,
        deviceType: session.deviceType || undefined,
        browser: session.browser || undefined,
        os: session.os || undefined,
      },
    };
  }

  /**
   * Generate cache key for session
   */
  private getCacheKey(userId: string, refreshTokenId: string): string {
    return `${this.CACHE_PREFIX}:${userId}:${refreshTokenId}`;
  }

  /**
   * Get Redis keys by pattern (Redis SCAN equivalent)
   */
  private async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      const redis = this.redisService.getClient();
      const keys: string[] = [];
      let cursor = '0';

      do {
        const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');

      return keys;
    } catch (error) {
      console.warn('Failed to scan Redis keys', error, {
        pattern,
        source: 'session-cache',
      });
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalSessions: number;
    cacheHitRate: number;
    memoryUsage: string;
  }> {
    try {
      const pattern = `${this.CACHE_PREFIX}:*`;
      const keys = await this.getKeysByPattern(pattern);

      // Get Redis memory usage
      const redis = this.redisService.getClient();
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        totalSessions: keys.length,
        cacheHitRate: 0, // This would need to be tracked separately
        memoryUsage,
      };
    } catch (error) {
      console.warn('Failed to get cache stats', error, {
        source: 'session-cache',
      });
      return {
        totalSessions: 0,
        cacheHitRate: 0,
        memoryUsage: 'Unknown',
      };
    }
  }
}

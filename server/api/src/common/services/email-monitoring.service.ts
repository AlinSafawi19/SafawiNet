import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailLog, Prisma } from '@prisma/client';

export interface EmailMetrics {
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  rejected: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
}

export interface BounceInfo {
  email: string;
  bounceType: 'Permanent' | 'Transient';
  bounceSubType: string;
  timestamp: Date;
  feedbackId: string;
}

export interface ComplaintInfo {
  email: string;
  complaintFeedbackType: string;
  timestamp: Date;
  feedbackId: string;
}

export interface HealthReport {
  timestamp: Date;
  environment: string;
  healthy: boolean;
  issues: string[];
  metrics: EmailMetrics;
  recommendations: string[];
}

@Injectable()
export class EmailMonitoringService {
  private readonly logger = new Logger(EmailMonitoringService.name);
  private readonly metricsCacheKey = 'email:metrics';
  private readonly metricsCacheTTL = 300; // 5 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get current email delivery metrics
   */
  async getEmailMetrics(): Promise<EmailMetrics> {
    // Try to get from cache first
    const cached = await this.redisService.get(this.metricsCacheKey);
    if (cached) {
      return JSON.parse(cached) as EmailMetrics;
    }

    // Calculate fresh metrics
    const metrics = await this.calculateEmailMetrics();

    // Cache the results
    await this.redisService.set(
      this.metricsCacheKey,
      JSON.stringify(metrics),
      this.metricsCacheTTL,
    );

    return metrics;
  }

  /**
   * Calculate email delivery metrics from database
   */
  private async calculateEmailMetrics(): Promise<EmailMetrics> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get email statistics from the last 24 hours
    const [sent, delivered, bounced, complained, rejected] = await Promise.all([
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: last24Hours },
          status: 'sent',
        },
      }),
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: last24Hours },
          status: 'delivered',
        },
      }),
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: last24Hours },
          status: 'bounced',
        },
      }),
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: last24Hours },
          status: 'complained',
        },
      }),
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: last24Hours },
          status: 'rejected',
        },
      }),
    ]);

    const totalSent = sent + delivered + bounced + complained + rejected;

    return {
      sent: totalSent,
      delivered,
      bounced,
      complained,
      rejected,
      openRate: 0, // Would need to track opens separately
      clickRate: 0, // Would need to track clicks separately
      bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
      complaintRate: totalSent > 0 ? (complained / totalSent) * 100 : 0,
    };
  }

  /**
   * Check if email delivery is healthy for production
   */
  async isEmailDeliveryHealthy(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: EmailMetrics;
  }> {
    const metrics = await this.getEmailMetrics();
    const issues: string[] = [];

    // Check bounce rate (should be < 5% for production)
    if (metrics.bounceRate > 5) {
      issues.push(
        `Bounce rate too high: ${metrics.bounceRate.toFixed(2)}% (should be < 5%)`,
      );
    }

    // Check complaint rate (should be < 0.1% for production)
    if (metrics.complaintRate > 0.1) {
      issues.push(
        `Complaint rate too high: ${metrics.complaintRate.toFixed(3)}% (should be < 0.1%)`,
      );
    }

    // Check delivery rate (should be > 95% for production)
    const deliveryRate =
      metrics.sent > 0 ? (metrics.delivered / metrics.sent) * 100 : 0;
    if (deliveryRate < 95) {
      issues.push(
        `Delivery rate too low: ${deliveryRate.toFixed(2)}% (should be > 95%)`,
      );
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  }

  /**
   * Process SES bounce notification
   */
  async processBounce(bounceInfo: BounceInfo): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Log the bounce
        await tx.emailLog.create({
          data: {
            email: bounceInfo.email,
            type: 'bounce',
            status: 'bounced',
            metadata: {
              bounceType: bounceInfo.bounceType,
              bounceSubType: bounceInfo.bounceSubType,
              feedbackId: bounceInfo.feedbackId,
            },
            createdAt: bounceInfo.timestamp,
          },
        });

        // If permanent bounce, mark user email as invalid
        if (bounceInfo.bounceType === 'Permanent') {
          await tx.user.updateMany({
            where: { email: bounceInfo.email },
            data: {
              isVerified: false,
              // Add a flag to indicate email is invalid
              preferences: {
                emailInvalid: true,
                emailInvalidReason: bounceInfo.bounceSubType,
                emailInvalidAt: new Date().toISOString(),
              },
            },
          });

          // Create notification for user if found
          const user = await tx.user.findUnique({
            where: { email: bounceInfo.email },
            select: { id: true },
          });

          if (user) {
            await tx.notification.create({
              data: {
                userId: user.id,
                type: 'email_bounce',
                title: 'Email Delivery Issue',
                message:
                  'We were unable to deliver emails to your address. Please update your email address.',
                priority: 'high',
                metadata: {
                  bounceType: bounceInfo.bounceType,
                  bounceSubType: bounceInfo.bounceSubType,
                },
              },
            });
          }
        }
      });

      // Clear metrics cache to force refresh
      await this.redisService.del(this.metricsCacheKey);
    } catch (error) {
      this.logger.error('Failed to process bounce notification', error, {
        source: 'email-monitoring',
        email: bounceInfo.email,
        bounceType: bounceInfo.bounceType,
      });
    }
  }

  /**
   * Process SES complaint notification
   */
  async processComplaint(complaintInfo: ComplaintInfo): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Log the complaint
        await tx.emailLog.create({
          data: {
            email: complaintInfo.email,
            type: 'complaint',
            status: 'complained',
            metadata: {
              complaintFeedbackType: complaintInfo.complaintFeedbackType,
              feedbackId: complaintInfo.feedbackId,
            },
            createdAt: complaintInfo.timestamp,
          },
        });

        // Mark user as unsubscribed
        await tx.user.updateMany({
          where: { email: complaintInfo.email },
          data: {
            notificationPreferences: {
              emailUnsubscribed: true,
              emailUnsubscribedAt: new Date().toISOString(),
              emailUnsubscribedReason: complaintInfo.complaintFeedbackType,
            },
          },
        });

        // Create notification for user if found
        const user = await tx.user.findUnique({
          where: { email: complaintInfo.email },
          select: { id: true },
        });

        if (user) {
          await tx.notification.create({
            data: {
              userId: user.id,
              type: 'email_complaint',
              title: 'Email Preferences Updated',
              message:
                'You have been unsubscribed from email notifications due to a complaint.',
              priority: 'normal',
              metadata: {
                complaintFeedbackType: complaintInfo.complaintFeedbackType,
              },
            },
          });
        }
      });

      // Clear metrics cache to force refresh
      await this.redisService.del(this.metricsCacheKey);
    } catch (error) {
      this.logger.error('Failed to process complaint notification', error, {
        source: 'email-monitoring',
        email: complaintInfo.email,
        complaintFeedbackType: complaintInfo.complaintFeedbackType,
      });
    }
  }

  /**
   * Get email delivery health report
   */
  async getHealthReport(): Promise<{
    timestamp: Date;
    environment: string;
    healthy: boolean;
    issues: string[];
    metrics: EmailMetrics;
    recommendations: string[];
  }> {
    const health = await this.isEmailDeliveryHealthy();
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );

    const recommendations: string[] = [];

    if (!health.healthy) {
      if (health.metrics.bounceRate > 5) {
        recommendations.push(
          'Review email list quality and remove invalid addresses',
        );
        recommendations.push('Implement double opt-in to reduce bounces');
      }

      if (health.metrics.complaintRate > 0.1) {
        recommendations.push('Review email content and frequency');
        recommendations.push('Ensure clear unsubscribe links in all emails');
      }

      if (health.metrics.sent < 100) {
        recommendations.push(
          'Insufficient data for accurate metrics - send more emails',
        );
      }
    }

    return {
      timestamp: new Date(),
      environment: environment,
      ...health,
      recommendations,
    };
  }

  /**
   * Scheduled task to check email health (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledHealthCheck(): Promise<void> {
    try {
      const health = await this.getHealthReport();

      if (!health.healthy) {
        // In production, you might want to send alerts here
        if (health.environment === 'production') {
          this.sendHealthAlert(health);
        }
      } else {
        this.logger.log('Email service health check passed', {
          source: 'email-monitoring',
          healthy: health.healthy,
        });
      }
    } catch (error) {
      this.logger.error('Failed to check email service health', error, {
        source: 'email-monitoring',
      });
    }
  }

  /**
   * Send health alert (placeholder for alerting system)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private sendHealthAlert(_health: HealthReport): void {}

  /**
   * Get email logs for debugging
   */
  async getEmailLogs(
    email?: string,
    status?: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{
    logs: EmailLog[];
    total: number;
  }> {
    const where: Prisma.EmailLogWhereInput = {};

    if (email) {
      where.email = email;
    }

    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return { logs, total };
  }
}

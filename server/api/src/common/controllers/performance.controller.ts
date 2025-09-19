import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PerformanceService } from '../services/performance.service';
import { QueueService } from '../services/queue.service';
import { CronService } from '../services/cron.service';

@ApiTags('performance')
@Controller('performance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Throttle({ api: { limit: 20, ttl: 60000 } }) // 20 performance requests per minute
export class PerformanceController {
  constructor(
    private performanceService: PerformanceService,
    private queueService: QueueService,
    private cronService: CronService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get performance statistics for all routes' })
  @ApiResponse({
    status: 200,
    description: 'Performance statistics retrieved successfully',
  })
  async getPerformanceStats(@Query('timeWindow') timeWindow?: string) {
    const window = timeWindow ? parseInt(timeWindow) : 3600000; // Default 1 hour
    return this.performanceService.getAllPerformanceStats(window);
  }

  @Get('stats/:route')
  @ApiOperation({ summary: 'Get performance statistics for a specific route' })
  @ApiResponse({
    status: 200,
    description: 'Route performance statistics retrieved successfully',
  })
  async getRoutePerformance(
    @Query('route') route: string,
    @Query('method') method: string = 'POST',
    @Query('timeWindow') timeWindow?: string,
  ) {
    const window = timeWindow ? parseInt(timeWindow) : 3600000; // Default 1 hour
    return this.performanceService.getRoutePerformance(route, method, window);
  }

  @Get('budgets')
  @ApiOperation({ summary: 'Check performance budget compliance' })
  @ApiResponse({
    status: 200,
    description: 'Performance budget check completed',
  })
  async checkPerformanceBudgets() {
    return this.performanceService.checkPerformanceBudgets();
  }

  @Get('burst-rates')
  @ApiOperation({ summary: 'Get current burst rates for all routes' })
  @ApiResponse({
    status: 200,
    description: 'Current burst rates retrieved successfully',
  })
  async getCurrentBurstRates() {
    return this.performanceService.getCurrentBurstRates();
  }

  @Get('queues')
  @ApiOperation({ summary: 'Get queue status for background jobs' })
  @ApiResponse({
    status: 200,
    description: 'Queue status retrieved successfully',
  })
  async getQueueStatus() {
    return this.queueService.getQueueStatus();
  }

  @Get('cleanup/tokens')
  @ApiOperation({ summary: 'Manually trigger token cleanup' })
  @ApiResponse({ status: 200, description: 'Token cleanup completed' })
  async manualTokenCleanup() {
    const count = await this.cronService.manualTokenCleanup();
    return { message: 'Token cleanup completed', cleanedCount: count };
  }

  @Get('cleanup/sessions')
  @ApiOperation({ summary: 'Manually trigger session cleanup' })
  @ApiResponse({ status: 200, description: 'Session cleanup completed' })
  async manualSessionCleanup() {
    const count = await this.cronService.manualSessionCleanup();
    return { message: 'Session cleanup completed', cleanedCount: count };
  }

  @Get('cleanup/notifications')
  @ApiOperation({ summary: 'Manually trigger notification cleanup' })
  @ApiResponse({ status: 200, description: 'Notification cleanup completed' })
  async manualNotificationCleanup() {
    const count = await this.cronService.manualNotificationCleanup();
    return { message: 'Notification cleanup completed', cleanedCount: count };
  }
}

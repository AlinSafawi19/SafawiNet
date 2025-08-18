import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiBody,
  } from '@nestjs/swagger';
  import { JwtAuthGuard } from './guards/jwt-auth.guard';
  import { EmailMonitoringService, BounceInfo, ComplaintInfo } from '../common/services/email-monitoring.service';
  
  @ApiTags('Email Monitoring')
  @Controller('v1/email-monitoring')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class EmailMonitoringController {
    constructor(
      private readonly emailMonitoringService: EmailMonitoringService,
    ) {}
  
    @Get('health')
    @ApiOperation({
      summary: 'Get email delivery health status',
      description: 'Check if email delivery is healthy for production deployment',
    })
    @ApiResponse({
      status: 200,
      description: 'Email health status retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          environment: { type: 'string' },
          healthy: { type: 'boolean' },
          issues: { type: 'array', items: { type: 'string' } },
          metrics: {
            type: 'object',
            properties: {
              sent: { type: 'number' },
              delivered: { type: 'number' },
              bounced: { type: 'number' },
              complained: { type: 'number' },
              rejected: { type: 'number' },
              bounceRate: { type: 'number' },
              complaintRate: { type: 'number' },
            },
          },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async getEmailHealth() {
      // TODO: Add admin role check here
      return this.emailMonitoringService.getHealthReport();
    }
  
    @Get('metrics')
    @ApiOperation({
      summary: 'Get email delivery metrics',
      description: 'Get current email delivery metrics for monitoring',
    })
    @ApiResponse({
      status: 200,
      description: 'Email metrics retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          sent: { type: 'number' },
          delivered: { type: 'number' },
          bounced: { type: 'number' },
          complained: { type: 'number' },
          rejected: { type: 'number' },
          openRate: { type: 'number' },
          clickRate: { type: 'number' },
          bounceRate: { type: 'number' },
          complaintRate: { type: 'number' },
        },
      },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async getEmailMetrics() {
      // TODO: Add admin role check here
      return this.emailMonitoringService.getEmailMetrics();
    }
  
    @Get('logs')
    @ApiOperation({
      summary: 'Get email logs',
      description: 'Get email delivery logs for debugging and analysis',
    })
    @ApiQuery({ name: 'email', required: false, description: 'Filter by email address' })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by status (sent, delivered, bounced, complained, rejected)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of logs to return (max 1000)', type: Number })
    @ApiQuery({ name: 'offset', required: false, description: 'Number of logs to skip', type: Number })
    @ApiResponse({
      status: 200,
      description: 'Email logs retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          logs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                type: { type: 'string' },
                status: { type: 'string' },
                metadata: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          total: { type: 'number' },
        },
      },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async getEmailLogs(
      @Query('email') email?: string,
      @Query('status') status?: string,
      @Query('limit') limit: number = 100,
      @Query('offset') offset: number = 0,
    ) {
      // TODO: Add admin role check here
      return this.emailMonitoringService.getEmailLogs(email, status, limit, offset);
    }
  
    @Post('ses/bounce')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
      summary: 'Process SES bounce notification',
      description: 'Process AWS SES bounce notification (webhook endpoint)',
    })
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          bounce: {
            type: 'object',
            properties: {
              bounceType: { type: 'string', enum: ['Permanent', 'Transient'] },
              bounceSubType: { type: 'string' },
              bouncedRecipients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    emailAddress: { type: 'string' },
                  },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
              feedbackId: { type: 'string' },
            },
          },
        },
      },
    })
    @ApiResponse({ status: 200, description: 'Bounce processed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid bounce data' })
    async processSesBounce(@Body() body: any) {
      // TODO: Add SES webhook signature verification here
      
      const bounce = body.bounce;
      if (!bounce || !bounce.bouncedRecipients) {
        throw new Error('Invalid bounce data');
      }

      const results: Array<{ email: string; status: string; error?: string }> = [];
      
      for (const recipient of bounce.bouncedRecipients) {
        const bounceInfo: BounceInfo = {
          email: recipient.emailAddress,
          bounceType: bounce.bounceType,
          bounceSubType: bounce.bounceSubType,
          timestamp: new Date(bounce.timestamp),
          feedbackId: bounce.feedbackId,
        };

        try {
          await this.emailMonitoringService.processBounce(bounceInfo);
          results.push({ email: recipient.emailAddress, status: 'processed' });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ email: recipient.emailAddress, status: 'failed', error: errorMessage });
        }
      }

      return { processed: results };
    }
  
    @Post('ses/complaint')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
      summary: 'Process SES complaint notification',
      description: 'Process AWS SES complaint notification (webhook endpoint)',
    })
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          complaint: {
            type: 'object',
            properties: {
              complainedRecipients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    emailAddress: { type: 'string' },
                  },
                },
              },
              complaintFeedbackType: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              feedbackId: { type: 'string' },
            },
          },
        },
      },
    })
    @ApiResponse({ status: 200, description: 'Complaint processed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid complaint data' })
    async processSesComplaint(@Body() body: any) {
      // TODO: Add SES webhook signature verification here
      
      const complaint = body.complaint;
      if (!complaint || !complaint.complainedRecipients) {
        throw new Error('Invalid complaint data');
      }

      const results: Array<{ email: string; status: string; error?: string }> = [];
      
      for (const recipient of complaint.complainedRecipients) {
        const complaintInfo: ComplaintInfo = {
          email: recipient.emailAddress,
          complaintFeedbackType: complaint.complaintFeedbackType,
          timestamp: new Date(complaint.timestamp),
          feedbackId: complaint.feedbackId,
        };

        try {
          await this.emailMonitoringService.processComplaint(complaintInfo);
          results.push({ email: recipient.emailAddress, status: 'processed' });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ email: recipient.emailAddress, status: 'failed', error: errorMessage });
        }
      }

      return { processed: results };
    }
  }
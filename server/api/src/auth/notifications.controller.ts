import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import {
  NotificationListDto,
  NotificationMarkReadDto,
} from './schemas/auth.schemas';
import { Request as ExpressRequest } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NotificationListSchema } from './schemas/auth.schemas';

@ApiTags('Notifications')
@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List user notifications',
    description:
      'Get a paginated list of user notifications with cursor pagination',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of notifications to return (max 100)',
    type: Number,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by notification type',
  })
  @ApiQuery({
    name: 'isRead',
    required: false,
    description: 'Filter by read status',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              isRead: { type: 'boolean' },
              readAt: { type: 'string', format: 'date-time', nullable: true },
              metadata: { type: 'object', nullable: true },
              priority: { type: 'string' },
              expiresAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
        hasMore: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(NotificationListSchema))
  async listNotifications(
    @Request() req: ExpressRequest & { user: { sub: string } },
    @Query() query: NotificationListDto,
  ) {
    return this.notificationsService.listNotifications(req.user.sub, query);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read by ID',
  })
  @ApiParam({ name: 'id', description: 'Notification ID to mark as read' })
  @ApiResponse({
    status: 204,
    description: 'Notification marked as read successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Request() req: ExpressRequest & { user: { sub: string } },
    @Param() params: NotificationMarkReadDto,
  ) {
    await this.notificationsService.markAsRead(req.user.sub, params.id);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description:
      'Get the total count of unread notifications for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(
    @Request() req: ExpressRequest & { user: { sub: string } },
  ) {
    const count = await this.notificationsService.getUnreadCount(req.user.sub);
    return { count };
  }
}

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
import { Throttle } from '@nestjs/throttler';
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
  NotificationListResponseDto,
  UnreadCountResponseDto,
} from './schemas/auth.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NotificationListSchema } from './schemas/auth.schemas';
import { AuthenticatedRequest } from './types/auth.types';
import { PaginatedNotifications } from './notifications.service';

@ApiTags('Notifications')
@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Throttle({ users: { limit: 50, ttl: 60000 } }) // 50 notification requests per minute
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
    type: NotificationListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(NotificationListSchema))
  async listNotifications(
    @Request() req: AuthenticatedRequest,
    @Query() query: NotificationListDto,
  ): Promise<PaginatedNotifications> {
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
    @Request() req: AuthenticatedRequest,
    @Param() params: NotificationMarkReadDto,
  ): Promise<void> {
    await this.notificationsService.markAsRead(req.user.sub, String(params.id));
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
    type: UnreadCountResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(req.user.sub);
    return { count };
  }
}

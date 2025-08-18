import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Body,
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
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionsService } from './sessions.service';
import { NotificationsService } from './notifications.service';
import {
  SessionListDto,
  SessionDeleteDto,
  SessionRevokeAllDto,
} from './schemas/auth.schemas';
import { Request as ExpressRequest } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SessionListSchema } from './schemas/auth.schemas';

@ApiTags('Sessions')
@Controller('v1/sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List user sessions',
    description: 'Get a paginated list of all user sessions with device information',
  })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of sessions to return (max 100)', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        sessions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              deviceFingerprint: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              location: { type: 'string', nullable: true },
              deviceType: { type: 'string', nullable: true },
              browser: { type: 'string', nullable: true },
              os: { type: 'string', nullable: true },
              isCurrent: { type: 'boolean' },
              lastActiveAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
        hasMore: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(SessionListSchema))
  async listSessions(
    @Request() req: ExpressRequest & { user: { sub: string } },
    @Query() query: SessionListDto,
  ) {
    return this.sessionsService.listSessions(req.user.sub, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a specific session',
    description: 'Delete a user session by ID. Cannot delete the current session.',
  })
  @ApiParam({ name: 'id', description: 'Session ID to delete' })
  @ApiResponse({ status: 204, description: 'Session deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete current session' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async deleteSession(
    @Request() req: ExpressRequest & { user: { sub: string } },
    @Param() params: SessionDeleteDto,
  ) {
    await this.sessionsService.deleteSession(req.user.sub, params.id);

    // Create security notification
    await this.notificationsService.createSecurityAlert(
      req.user.sub,
      'Session Terminated',
      'A device session has been terminated from your account.',
      { sessionId: params.id, action: 'session_deleted' },
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke all sessions except current',
    description: 'Revoke all user sessions except the current one. Optionally keep the current session.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        keepCurrent: {
          type: 'boolean',
          description: 'Whether to keep the current session',
          default: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions revoked successfully',
    schema: {
      type: 'object',
      properties: {
        revokedCount: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeAllSessions(
    @Request() req: ExpressRequest & { user: { sub: string } },
    @Body() body: SessionRevokeAllDto,
  ) {
    const { revokedCount } = await this.sessionsService.revokeAllSessions(
      req.user.sub,
      body.keepCurrent,
    );

    // Create security notification
    if (revokedCount > 0) {
      await this.notificationsService.createSecurityAlert(
        req.user.sub,
        'Multiple Sessions Revoked',
        `${revokedCount} device sessions have been revoked from your account.`,
        { revokedCount, action: 'sessions_revoked' },
      );
    }

    return {
      revokedCount,
      message: `Successfully revoked ${revokedCount} sessions`,
    };
  }
}

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
import { RolesGuard } from './guards/roles.guard';
import { SessionsService } from './sessions.service';
import { NotificationsService } from './notifications.service';
import {
  SessionListDto,
  SessionDeleteDto,
  SessionRevokeAllDto,
} from './schemas/auth.schemas';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SessionListSchema } from './schemas/auth.schemas';
import {
  AuthenticatedRequest,
  RevokeUserSessionsBody,
  RevokeResponse,
  SecurityAuditInfo,
  PaginatedSessionsResponse,
  SecurityAlertMetadata,
} from './types/auth.types';

@ApiTags('Sessions')
@Controller('v1/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List user sessions',
    description:
      'Get a paginated list of all user sessions with device information',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of sessions to return (max 100)',
    type: Number,
  })
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
    @Request() req: AuthenticatedRequest,
    @Query() query: SessionListDto,
  ): Promise<PaginatedSessionsResponse> {
    return this.sessionsService.listSessions(req.user.sub, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a specific session',
    description:
      'Delete a user session by ID. Cannot delete the current session.',
  })
  @ApiParam({ name: 'id', description: 'Session ID to delete' })
  @ApiResponse({ status: 204, description: 'Session deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete current session' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async deleteSession(
    @Request() req: AuthenticatedRequest,
    @Param() params: SessionDeleteDto,
  ): Promise<void> {
    await this.sessionsService.deleteSession(req.user.sub, params.id as string);

    // Create security notification
    const metadata: SecurityAlertMetadata = {
      sessionId: params.id as string,
      action: 'session_deleted',
    };
    await this.notificationsService.createSecurityAlert(
      req.user.sub,
      'Session Terminated',
      'A device session has been terminated from your account.',
      metadata,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke all sessions except current',
    description:
      'Revoke all user sessions except the current one. Optionally keep the current session.',
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
    @Request() req: AuthenticatedRequest,
    @Body() body: SessionRevokeAllDto,
  ): Promise<RevokeResponse> {
    const { revokedCount } = await this.sessionsService.revokeAllSessions(
      req.user.sub,
      body.keepCurrent as boolean,
    );

    // Create security notification
    if (revokedCount > 0) {
      const metadata: SecurityAlertMetadata = {
        revokedCount,
        action: 'sessions_revoked',
      };
      await this.notificationsService.createSecurityAlert(
        req.user.sub,
        'Multiple Sessions Revoked',
        `${revokedCount} device sessions have been revoked from your account.`,
        metadata,
      );
    }

    return {
      revokedCount,
      message: `Successfully revoked ${revokedCount} sessions`,
    };
  }

  @Delete('revoke-family/:familyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke token family',
    description:
      'Revoke all sessions in a specific token family (security incident response)',
  })
  @ApiParam({ name: 'familyId', description: 'Token family ID to revoke' })
  @ApiResponse({
    status: 200,
    description: 'Token family revoked successfully',
    schema: {
      type: 'object',
      properties: {
        revokedCount: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async revokeTokenFamily(
    @Param('familyId') familyId: string,
  ): Promise<RevokeResponse> {
    // TODO: Add admin role check here
    const result = await this.sessionsService.revokeTokenFamily(familyId);
    return {
      revokedCount: result.revokedCount,
      message: `Successfully revoked ${result.revokedCount} sessions in token family ${familyId}`,
    };
  }

  @Delete('revoke-user/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke all user sessions',
    description:
      'Revoke all active sessions for a specific user (admin security action)',
  })
  @ApiParam({ name: 'userId', description: 'User ID to revoke sessions for' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for revocation' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User sessions revoked successfully',
    schema: {
      type: 'object',
      properties: {
        revokedCount: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async revokeUserSessions(
    @Param('userId') userId: string,
    @Body() body: RevokeUserSessionsBody,
  ): Promise<RevokeResponse> {
    // TODO: Add admin role check here
    const result = await this.sessionsService.revokeAllUserSessions(
      userId,
      body.reason,
    );
    return {
      revokedCount: result.revokedCount,
      message: `Successfully revoked ${result.revokedCount} sessions for user ${userId}`,
    };
  }

  @Get('security-audit/:userId')
  @ApiOperation({
    summary: 'Get security audit information',
    description: 'Get security audit information for a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User ID to audit' })
  @ApiResponse({
    status: 200,
    description: 'Security audit information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        activeSessions: { type: 'number' },
        totalSessions: { type: 'number' },
        lastLogin: { type: 'string', format: 'date-time', nullable: true },
        suspiciousActivity: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getSecurityAuditInfo(
    @Param('userId') userId: string,
  ): Promise<SecurityAuditInfo> {
    // TODO: Add admin role check here
    return this.sessionsService.getSecurityAuditInfo(userId);
  }
}

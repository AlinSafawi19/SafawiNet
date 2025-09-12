import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  LoyaltyService,
  LoyaltyAccountInfo,
  PaginatedTransactions,
} from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

// Interface for authenticated request with user properties
interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    sub: string;
    email: string;
    name: string;
    verified: boolean;
    roles: string[];
    refreshTokenId: string;
  };
}

@ApiTags('Loyalty')
@Controller('v1/loyalty')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user loyalty account information' })
  @ApiResponse({
    status: 200,
    description: 'Returns current tier and balances',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        currentTier: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            minPoints: { type: 'number' },
            maxPoints: { type: 'number', nullable: true },
            benefits: { type: 'object' },
            color: { type: 'string', nullable: true },
            icon: { type: 'string', nullable: true },
          },
        },
        currentPoints: { type: 'number' },
        lifetimePoints: { type: 'number' },
        tierUpgradedAt: { type: 'string', format: 'date-time', nullable: true },
        nextTier: {
          type: 'object',
          nullable: true,
          properties: {
            name: { type: 'string' },
            minPoints: { type: 'number' },
            pointsNeeded: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Loyalty account not found' })
  async getMyLoyaltyAccount(
    @Request() req: AuthenticatedRequest,
  ): Promise<LoyaltyAccountInfo> {
    return this.loyaltyService.getUserLoyaltyAccount(req.user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get user loyalty transaction history' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of transactions to return (max 100)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated transaction history',
    schema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              points: { type: 'number' },
              description: { type: 'string' },
              metadata: { type: 'object' },
              orderId: { type: 'string', nullable: true },
              expiresAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            hasNext: { type: 'boolean' },
            hasPrevious: { type: 'boolean' },
            nextCursor: { type: 'string', nullable: true },
            previousCursor: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Loyalty account not found' })
  async getMyTransactions(
    @Request() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<PaginatedTransactions> {
    return this.loyaltyService.getUserTransactions(req.user.id, cursor, limit);
  }
}

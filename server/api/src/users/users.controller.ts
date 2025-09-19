import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role, User } from '@prisma/client';
import { LoggerService } from '../common/services/logger.service';
import {
  CreateUserSchema,
  CreateUserDto,
  VerifyEmailSchema,
  VerifyEmailDto,
  RequestPasswordResetSchema,
  RequestPasswordResetDto,
  ResetPasswordSchema,
  ResetPasswordDto,
  UpdateProfileSchema,
  UpdateProfileDto,
  UpdatePreferencesSchema,
  UpdatePreferencesDto,
  UpdateNotificationPreferencesSchema,
  UpdateNotificationPreferencesDto,
  ChangePasswordSchema,
  ChangePasswordDto,
} from './schemas/user.schemas';

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

@ApiTags('Users')
@Controller('users')
export class UsersController {
  // Note: The POST /users endpoint creates admin users with ADMIN role
  // For regular customer registration, use POST /auth/register instead
  // GET /users/admins - Get all admin users (admin-only)
  // GET /users/customers - Get all customer users (admin-only)

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Throttle({ users: { limit: 10, ttl: 60000 } }) // 10 user creations per minute
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new admin user (Superadmin only)' })
  @ApiBody({
    description: 'Admin user creation data - creates users with ADMIN role',
    examples: {
      createUser: {
        summary: 'Create a new admin user',
        value: {
          email: 'admin@safawinet.com',
          password: 'admin123456',
          name: 'John Smith',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Superadmin role required',
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ message: string; user: Omit<User, 'password'> }> {
    this.loggerService.info('Admin user creation attempt', {
      source: 'api',
      metadata: { endpoint: 'createUser', service: 'users', email: createUserDto.email }
    });

    try {
      const user = await this.usersService.createUser(createUserDto);
      this.loggerService.info('Admin user created successfully', {
        userId: user.id,
        source: 'api',
        metadata: { endpoint: 'createUser', service: 'users', email: user.email }
      });
      return {
        message: 'Admin user created successfully',
        user,
      };
    } catch (error) {
      this.loggerService.error('Admin user creation failed', error as Error, {
        source: 'api',
        metadata: { endpoint: 'createUser', service: 'users', email: createUserDto.email }
      });
      throw error;
    }
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admin users (Superadmin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of admin users retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Superadmin role required',
  })
  async findAllAdmins(): Promise<{ admins: Omit<User, 'password'>[] }> {
    const admins = await this.usersService.findAllAdmins();
    return { admins };
  }

  @Get('customers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all customer users' })
  @ApiResponse({
    status: 200,
    description: 'List of customer users retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async findAllCustomers(): Promise<{ customers: Omit<User, 'password'>[] }> {
    const customers = await this.usersService.findAllCustomers();
    return { customers };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully or user not authenticated',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'User profile if authenticated, null if not authenticated',
        },
        authenticated: {
          type: 'boolean',
          description: 'Whether the user is authenticated',
        },
      },
    },
  })
  async getCurrentUser(
    @Request() req: ExpressRequest,
  ): Promise<{ user: Omit<User, 'password'> | null; authenticated: boolean }> {
    
    try {
      // Extract token from cookies first, then from Authorization header
      let token: string | undefined;
      
      // Check cookies first
      if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
      } else {
        // Fallback to Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else {
        }
      }

      if (!token) {
        return { user: null, authenticated: false };
      }

      // Verify the token
      const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'fallback-secret';
      const payload = this.jwtService.verify(token!, { secret: jwtSecret });
      
      // Get user data
      const user = await this.usersService.getCurrentUser(payload.sub);
      return { user, authenticated: true };
      
    } catch (error) {
      return { user: null, authenticated: false };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findUserById(
    @Param('id') id: string,
  ): Promise<{ message: string } | { user: Omit<User, 'password'> }> {
    const user = await this.usersService.findUserById(id);
    if (!user) {
      return { message: 'User not found' };
    }
    return { user };
  }

  @Post('verify-email')
  @Throttle({ users: { limit: 5, ttl: 300000 } }) // 5 email verifications per 5 minutes
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiBody({
    description: 'Email verification data',
    examples: {
      verifyEmail: {
        summary: 'Verify email with token',
        value: {
          token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyEmailSchema))
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    const success = await this.usersService.verifyEmail(
      String(verifyEmailDto.token),
    );
    if (success) {
      return { message: 'Email verified successfully' };
    }
    return { message: 'Invalid or expired verification token' };
  }

  @Post('request-password-reset')
  @Throttle({ users: { limit: 3, ttl: 300000 } }) // 3 password reset requests per 5 minutes
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({
    description: 'Password reset request data',
    examples: {
      requestReset: {
        summary: 'Request password reset',
        value: {
          email: 'user@safawinet.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if user exists',
  })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RequestPasswordResetSchema))
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    await this.usersService.requestPasswordReset(
      String(requestPasswordResetDto.email),
    );
    return { message: 'Password reset email sent if user exists' };
  }

  @Post('reset-password')
  @Throttle({ users: { limit: 5, ttl: 300000 } }) // 5 password reset attempts per 5 minutes
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({
    description: 'Password reset data',
    examples: {
      resetPassword: {
        summary: 'Reset password with token',
        value: {
          token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          newPassword: 'newSecurePassword123',
          confirmNewPassword: 'newSecurePassword123',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const success = await this.usersService.resetPassword(
      String(resetPasswordDto.token),
      String(resetPasswordDto.newPassword),
    );
    if (success) {
      return { message: 'Password reset successfully' };
    }
    return { message: 'Invalid or expired reset token' };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({
    description: 'Profile update data',
    examples: {
      updateProfile: {
        summary: 'Update user profile',
        value: {
          name: 'John Smith',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<{ message: string; user: Omit<User, 'password'> }> {
    const user = await this.usersService.updateProfile(
      req.user.sub,
      updateProfileDto,
    );
    return {
      message: 'Profile updated successfully',
      user,
    };
  }

  @Put('me/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user preferences' })
  @ApiBody({
    description: 'User preferences data',
    examples: {
      updatePreferences: {
        summary: 'Update user preferences',
        value: {
          theme: 'dark',
          language: 'en',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          notifications: {
            sound: true,
            desktop: true,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(UpdatePreferencesSchema))
  async updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<{ message: string; user: Omit<User, 'password'> }> {
    const user = await this.usersService.updatePreferences(
      req.user.sub,
      updatePreferencesDto,
    );
    return {
      message: 'Preferences updated successfully',
      user,
    };
  }

  @Put('me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @ApiBody({
    description: 'Notification preferences data',
    examples: {
      updateNotificationPreferences: {
        summary: 'Update notification preferences',
        value: {
          email: {
            marketing: false,
            security: true,
            updates: true,
            weeklyDigest: false,
          },
          push: {
            enabled: true,
            marketing: false,
            security: true,
            updates: true,
          },
          sms: {
            enabled: false,
            security: true,
            twoFactor: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(UpdateNotificationPreferencesSchema))
  async updateNotificationPreferences(
    @Request() req: AuthenticatedRequest,
    @Body() updateNotificationPreferencesDto: UpdateNotificationPreferencesDto,
  ): Promise<{ message: string; user: Omit<User, 'password'> }> {
    const user = await this.usersService.updateNotificationPreferences(
      req.user.sub,
      updateNotificationPreferencesDto,
    );
    return {
      message: 'Notification preferences updated successfully',
      user,
    };
  }

  @Post('me/change-password')
  @ApiBearerAuth()
  @Throttle({ users: { limit: 5, ttl: 300000 } }) // 5 password changes per 5 minutes
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({
    description: 'Password change data',
    examples: {
      changePassword: {
        summary: 'Change password',
        value: {
          currentPassword: 'user123456',
          newPassword: 'newPassword123',
          confirmNewPassword: 'newPassword123',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or incorrect current password',
  })
  @UsePipes(new ZodValidationPipe(ChangePasswordSchema))
  async changePassword(
    @Request() req: ExpressRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string; messageKey: string }> {
    
    try {
      // Extract token from cookies first, then from Authorization header
      let token: string | undefined;
      
      // Check cookies first
      if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
      } else {
        // Fallback to Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else {
        }
      }

      if (!token) {
        throw new UnauthorizedException('Authentication required');
      }

      // Verify the token
      const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'fallback-secret';
      const payload = this.jwtService.verify(token!, { secret: jwtSecret });
      

      // Get user data to verify they exist and are verified
      const user = await this.usersService.getCurrentUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isVerified) {
        throw new UnauthorizedException('Email not verified');
      }

      // Proceed with password change
    const result = await this.usersService.changePassword(
        payload.sub,
      changePasswordDto,
    );
    return result;
      
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

import { Controller, Post, Body, Get, Param, UseGuards, UsePipes, HttpCode, HttpStatus, Patch, Put, Request, Logger } from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
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

@ApiTags('Users')
@Controller('users')
export class UsersController {
  // Note: The POST /users endpoint creates admin users with ADMIN role
  // For regular customer registration, use POST /auth/register instead
  // GET /users/admins - Get all admin users (admin-only)
  // GET /users/customers - Get all customer users (admin-only)
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new admin user' })
  @ApiBody({
    description: 'Admin user creation data - creates users with ADMIN role',
    examples: {
      createUser: {
        summary: 'Create a new admin user',
        value: {
          email: 'admin@safawinet.com',
          password: 'admin123456',
          name: 'John Smith'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return {
      message: 'Admin user created successfully',
      user,
    };
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admin users' })
  @ApiResponse({ status: 200, description: 'List of admin users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async findAllAdmins() {
    const admins = await this.usersService.findAllAdmins();
    return { admins };
  }

  @Get('customers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all customer users' })
  @ApiResponse({ status: 200, description: 'List of customer users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async findAllCustomers() {
    const customers = await this.usersService.findAllCustomers();
    return { customers };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req: any) {
    this.logger.log('🚀 /users/me endpoint reached!');
    this.logger.log('🚀 Request user object:', req.user);
    
    const user = await this.usersService.getCurrentUser(req.user.sub);
    return { user };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findUserById(@Param('id') id: string) {
    const user = await this.usersService.findUserById(id);
    if (!user) {
      return { message: 'User not found' };
    }
    return { user };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiBody({
    description: 'Email verification data',
    examples: {
      verifyEmail: {
        summary: 'Verify email with token',
        value: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyEmailSchema))
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const success = await this.usersService.verifyEmail(verifyEmailDto.token);
    if (success) {
      return { message: 'Email verified successfully' };
    }
    return { message: 'Invalid or expired verification token' };
  }

  @Post('request-password-reset')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({
    description: 'Password reset request data',
    examples: {
      requestReset: {
    summary: 'Request password reset',
        value: {
          email: 'user@safawinet.com'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Password reset email sent if user exists' })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RequestPasswordResetSchema))
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    await this.usersService.requestPasswordReset(requestPasswordResetDto.email);
    return { message: 'Password reset email sent if user exists' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({
    description: 'Password reset data',
    examples: {
      resetPassword: {
        summary: 'Reset password with token',
        value: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          newPassword: 'newSecurePassword123',
          confirmNewPassword: 'newSecurePassword123'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const success = await this.usersService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
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
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  async updateProfile(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(req.user.sub, updateProfileDto);
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
            desktop: true
          }
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(UpdatePreferencesSchema))
  async updatePreferences(@Request() req: any, @Body() updatePreferencesDto: UpdatePreferencesDto) {
    const user = await this.usersService.updatePreferences(req.user.sub, updatePreferencesDto);
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
            weeklyDigest: false
          },
          push: {
            enabled: true,
            marketing: false,
            security: true,
            updates: true
          },
          sms: {
            enabled: false,
            security: true,
            twoFactor: true
          }
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Notification preferences updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ZodValidationPipe(UpdateNotificationPreferencesSchema))
  async updateNotificationPreferences(@Request() req: any, @Body() updateNotificationPreferencesDto: UpdateNotificationPreferencesDto) {
    const user = await this.usersService.updateNotificationPreferences(req.user.sub, updateNotificationPreferencesDto);
    return {
      message: 'Notification preferences updated successfully',
      user,
    };
  }


  @Post('me/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({
    description: 'Password change data',
    examples: {
      changePassword: {
        summary: 'Change password',
        value: {
          currentPassword: 'user123456',
          newPassword: 'newPassword123',
          confirmNewPassword: 'newPassword123'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized or incorrect current password' })
  @UsePipes(new ZodValidationPipe(ChangePasswordSchema))
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    const result = await this.usersService.changePassword(req.user.sub, changePasswordDto);
    return result;
  }

}

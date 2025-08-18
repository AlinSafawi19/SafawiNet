import { Controller, Post, Body, Get, Param, UseGuards, UsePipes, HttpCode, HttpStatus, Patch, Put, Request, Logger } from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  ChangeEmailSchema,
  ChangeEmailDto,
  ChangePasswordSchema,
  ChangePasswordDto,
  ConfirmEmailChangeSchema,
  ConfirmEmailChangeDto,
} from './schemas/user.schemas';

@ApiTags('Users')
@Controller('users')
@UseGuards(RateLimitGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({
    description: 'User creation data',
    examples: {
      createUser: {
    summary: 'Create a new user',
        value: {
          email: 'john.doe@example.com',
          password: 'securePassword123',
          name: 'John Doe'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @RateLimit({ limit: 5, windowSeconds: 300, keyPrefix: 'user_creation' })
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return {
      message: 'User created successfully',
      user,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users retrieved successfully' })
  @RateLimit({ limit: 100, windowSeconds: 60, keyPrefix: 'user_listing' })
  async findAllUsers() {
    const users = await this.usersService.findAllUsers();
    return { users };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RateLimit({ limit: 100, windowSeconds: 60, keyPrefix: 'get_current_user' })
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
  @RateLimit({ limit: 100, windowSeconds: 60, keyPrefix: 'user_detail' })
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
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowSeconds: 300, keyPrefix: 'email_verification' })
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
          email: 'john.doe@example.com'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Password reset email sent if user exists' })
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 3, windowSeconds: 3600, keyPrefix: 'password_reset_request' })
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
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          newPassword: 'newSecurePassword123',
          confirmNewPassword: 'newSecurePassword123'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, windowSeconds: 3600, keyPrefix: 'password_reset' })
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
          recoveryEmail: 'john.recovery@example.com'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Recovery email already in use' })
  @RateLimit({ limit: 10, windowSeconds: 300, keyPrefix: 'update_profile' })
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
  @RateLimit({ limit: 20, windowSeconds: 300, keyPrefix: 'update_preferences' })
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
  @RateLimit({ limit: 20, windowSeconds: 300, keyPrefix: 'update_notification_preferences' })
  @UsePipes(new ZodValidationPipe(UpdateNotificationPreferencesSchema))
  async updateNotificationPreferences(@Request() req: any, @Body() updateNotificationPreferencesDto: UpdateNotificationPreferencesDto) {
    const user = await this.usersService.updateNotificationPreferences(req.user.sub, updateNotificationPreferencesDto);
    return {
      message: 'Notification preferences updated successfully',
      user,
    };
  }

  @Post('me/change-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request email change' })
  @ApiBody({
    description: 'Email change request data',
    examples: {
      changeEmail: {
        summary: 'Request email change',
        value: {
          newEmail: 'newemail@example.com'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Email change confirmation sent' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @RateLimit({ limit: 5, windowSeconds: 3600, keyPrefix: 'change_email' })
  @UsePipes(new ZodValidationPipe(ChangeEmailSchema))
  async changeEmail(@Request() req: any, @Body() changeEmailDto: ChangeEmailDto) {
    const result = await this.usersService.changeEmail(req.user.sub, changeEmailDto);
    return result;
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
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword123',
          confirmNewPassword: 'newPassword123'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized or incorrect current password' })
  @RateLimit({ limit: 5, windowSeconds: 3600, keyPrefix: 'change_password' })
  @UsePipes(new ZodValidationPipe(ChangePasswordSchema))
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    const result = await this.usersService.changePassword(req.user.sub, changePasswordDto);
    return result;
  }

  @Post('confirm-email-change')
  @ApiOperation({ summary: 'Confirm email change with token' })
  @ApiBody({
    description: 'Email change confirmation data',
    examples: {
      confirmEmailChange: {
        summary: 'Confirm email change',
        value: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Email change confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, windowSeconds: 3600, keyPrefix: 'confirm_email_change' })
  @UsePipes(new ZodValidationPipe(ConfirmEmailChangeSchema))
  async confirmEmailChange(@Body() confirmEmailChangeDto: ConfirmEmailChangeDto) {
    const result = await this.usersService.confirmEmailChange(confirmEmailChangeDto.token);
    return result;
  }
}

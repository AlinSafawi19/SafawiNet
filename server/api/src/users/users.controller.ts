import { Controller, Post, Body, Get, Param, UseGuards, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';
import {
  CreateUserSchema,
  CreateUserDto,
  VerifyEmailSchema,
  VerifyEmailDto,
  RequestPasswordResetSchema,
  RequestPasswordResetDto,
  ResetPasswordSchema,
  ResetPasswordDto,
} from './schemas/user.schemas';

@ApiTags('Users')
@Controller('users')
@UseGuards(RateLimitGuard)
export class UsersController {
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
          newPassword: 'newSecurePassword123'
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
}

import { Controller, Post, Body, Get, Param, UseGuards, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
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

@Controller('users')
@UseGuards(RateLimitGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
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
  @RateLimit({ limit: 100, windowSeconds: 60, keyPrefix: 'user_listing' })
  async findAllUsers() {
    const users = await this.usersService.findAllUsers();
    return { users };
  }

  @Get(':id')
  @RateLimit({ limit: 100, windowSeconds: 60, keyPrefix: 'user_detail' })
  async findUserById(@Param('id') id: string) {
    const user = await this.usersService.findUserById(id);
    if (!user) {
      return { message: 'User not found' };
    }
    return { user };
  }

  @Post('verify-email')
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
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 3, windowSeconds: 3600, keyPrefix: 'password_reset_request' })
  @UsePipes(new ZodValidationPipe(RequestPasswordResetSchema))
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    await this.usersService.requestPasswordReset(requestPasswordResetDto.email);
    return { message: 'Password reset email sent if user exists' };
  }

  @Post('reset-password')
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

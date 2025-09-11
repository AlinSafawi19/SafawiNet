import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseGuards,
  Request,
  BadRequestException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { SimpleTwoFactorService } from './simple-two-factor.service';
import { Response } from 'express';
import {
  RegisterSchema,
  VerifyEmailSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  TwoFactorSetupSchema,
  TwoFactorEnableSchema,
  TwoFactorDisableSchema,
  TwoFactorLoginSchema,
  SimpleTwoFactorEnableSchema,
  SimpleTwoFactorDisableSchema,
  TwoFactorCodeSchema,
  RegisterDto,
  VerifyEmailDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  TwoFactorSetupDto,
  TwoFactorEnableDto,
  TwoFactorDisableDto,
  TwoFactorLoginDto,
  SimpleTwoFactorEnableDto,
  SimpleTwoFactorDisableDto,
  TwoFactorCodeDto,
} from './schemas/auth.schemas';
import { z } from 'zod';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly simpleTwoFactorService: SimpleTwoFactorService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    description: 'User registration data',
    examples: {
      register: {
        summary: 'Register a new user',
        value: {
          email: 'user@safawinet.com',
          password: 'user123456',
          name: 'Test User',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            isVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
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
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            isVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            twoFactorEnabled: { type: 'boolean' },
            notificationPreferences: { type: 'object', nullable: true },
            preferences: { type: 'object', nullable: true },
            roles: { type: 'array', items: { type: 'string' } },
          },
        },
        tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  @UsePipes(new ZodValidationPipe(VerifyEmailSchema))
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiBody({
    description: 'Resend verification email data',
    examples: {
      resendVerification: {
        summary: 'Resend verification email',
        value: {
          email: 'user@safawinet.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email or user not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({
    description: 'User login credentials',
    examples: {
      login: {
        summary: 'Login with email and password',
        value: {
          email: 'user@safawinet.com',
          password: 'user123456',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            isVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login requires email verification',
    schema: {
      type: 'object',
      properties: {
        requiresVerification: { type: 'boolean', example: true },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            isVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
  })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto, req);

    // If login was successful and tokens were generated, set them as HTTP-only cookies
    if (result.tokens) {
      this.authService.setAuthCookies(res, result.tokens);
      // Remove tokens from response body for security
      const { tokens, ...responseWithoutTokens } = result;
      return responseWithoutTokens;
    }

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token refreshed successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async refreshToken(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new BadRequestException('No refresh token provided');
    }

    const tokens = await this.authService.refreshToken({ refreshToken });
    this.authService.setAuthCookies(res, tokens);

    return { message: 'Token refreshed successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({
    description: 'Password reset request data',
    examples: {
      forgotPassword: {
        summary: 'Request password reset',
        value: {
          email: 'user@safawinet.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if account exists)',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({
    description: 'Password reset data',
    examples: {
      resetPassword: {
        summary: 'Reset password with token',
        value: {
          token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          password: 'newSecurePassword123',
          confirmPassword: 'newSecurePassword123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enable two-factor authentication',
    description:
      'Enable email-based 2FA for the authenticated user. No password required. Requires a valid JWT token in the Authorization header.',
  })
  @ApiBody({
    description: 'No request body required - user is identified from JWT token',
    examples: {
      enable2FA: {
        summary: 'Enable 2FA (no body required)',
        value: {},
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '2FA enabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '2FA already enabled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async enableTwoFactor(@Request() req) {
    return this.simpleTwoFactorService.enableTwoFactor(req.user.sub);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disable two-factor authentication',
    description:
      'Disable email-based 2FA for the authenticated user. Requires current password. Requires a valid JWT token in the Authorization header.',
  })
  @ApiBody({
    description: '2FA disable data',
    examples: {
      disable2FA: {
        summary: 'Disable 2FA with current password',
        value: {
          currentPassword: 'yourCurrentPassword',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '2FA disabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '2FA not enabled',
  })
  @ApiResponse({
    status: 401,
    description:
      'Invalid current password or unauthorized - Invalid or missing JWT token',
  })
  @UsePipes(new ZodValidationPipe(SimpleTwoFactorDisableSchema))
  async disableTwoFactor(
    @Request() req,
    @Body() twoFactorDisableDto: SimpleTwoFactorDisableDto,
  ) {
    return this.simpleTwoFactorService.disableTwoFactor(
      req.user.sub,
      twoFactorDisableDto.currentPassword,
    );
  }

  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with 2FA code' })
  @ApiBody({
    description: '2FA login data',
    examples: {
      twoFactorLogin: {
        summary: 'Complete login with email 2FA code',
        value: {
          userId: 'user_id_from_previous_login',
          code: '123456',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful with 2FA',
    schema: {
      type: 'object',
      properties: {
        tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number' },
          },
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            isVerified: { type: 'boolean' },
            twoFactorEnabled: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid 2FA code',
  })
  @UsePipes(new ZodValidationPipe(TwoFactorLoginSchema))
  async twoFactorLogin(
    @Body() twoFactorLoginDto: TwoFactorLoginDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.twoFactorLogin(
      twoFactorLoginDto.userId,
      twoFactorLoginDto,
      req,
    );

    // If login was successful and tokens were generated, set them as HTTP-only cookies
    if (result.tokens) {
      this.authService.setAuthCookies(res, result.tokens);
      // Remove tokens from response body for security
      const { tokens, ...responseWithoutTokens } = result;
      return responseWithoutTokens;
    }

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (refreshToken) {
        // Invalidate the refresh token
        await this.authService.invalidateRefreshToken(refreshToken);
      }

      // Clear cookies regardless of whether refresh token exists
      this.authService.clearAuthCookies(res);

      return { message: 'Logged out successfully' };
    } catch (error) {
      // Log the error but don't fail the logout
      console.error('Error during logout:', error);

      // Still clear cookies even if token invalidation fails
      this.authService.clearAuthCookies(res);

      return { message: 'Logged out successfully' };
    }
  }
}

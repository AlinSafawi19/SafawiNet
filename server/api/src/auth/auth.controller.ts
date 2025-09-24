import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import { SimpleTwoFactorService } from './simple-two-factor.service';
import { Response } from 'express';
import {
  RegisterSchema,
  VerifyEmailSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SimpleTwoFactorDisableSchema,
  TwoFactorCodeSchema,
  RegisterDto,
  VerifyEmailDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SimpleTwoFactorDisableDto,
  TwoFactorCodeDto,
} from './schemas/auth.schemas';
import { AuthenticatedRequest } from './types/auth.types';
import { User } from '@prisma/client';
import { AuthTokens, LoginResult } from './auth.service';

// Response interfaces for better type safety
interface RegisterResponse {
  message: string;
  user: Omit<User, 'password'>;
}

interface VerifyEmailResponse {
  message: string;
  user: Omit<User, 'password'>;
  tokens?: AuthTokens;
}

interface ResendVerificationResponse {
  message: string;
}

interface ForgotPasswordResponse {
  message: string;
}

interface ResetPasswordResponse {
  message: string;
  email: string;
}

interface TwoFactorEnableResponse {
  message: string;
}

interface TwoFactorDisableResponse {
  message: string;
  forceLogout: boolean;
}

interface LogoutResponse {
  message: string;
}

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly simpleTwoFactorService: SimpleTwoFactorService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ auth: { limit: 5, ttl: 60000 } }) // 5 registrations per minute
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
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    try {
      const result = await this.authService.register(registerDto);
      return result;
    } catch (error) {
      console.error('User registration failed', error as Error, {
        source: 'auth',
        endpoint: 'register',
        email: registerDto.email,
      });
      throw error;
    }
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
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VerifyEmailResponse> {
    const result = await this.authService.verifyEmail(verifyEmailDto);

    // If verification was successful and tokens were generated, set them as HTTP-only cookies
    if (result.tokens) {
      this.authService.setAuthCookies(res, result.tokens);
      // Remove tokens from response body for security
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tokens: _, ...responseWithoutTokens } = result;
      return responseWithoutTokens;
    }

    return result;
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
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  async resendVerification(
    @Body() body: ForgotPasswordDto,
  ): Promise<ResendVerificationResponse> {
    return this.authService.resendVerificationEmail(body.email as string);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60000 } }) // 10 login attempts per minute
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
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResult> {
    try {
      const result = await this.authService.login(loginDto, req);

      // If login was successful and tokens were generated, set them as HTTP-only cookies
      if (result.tokens) {
        this.authService.setAuthCookies(res, result.tokens);
        // Remove tokens from response body for security
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tokens: _, ...responseWithoutTokens } = result;
        return responseWithoutTokens;
      }

      return result;
    } catch (error) {
      console.error('User login failed', error as Error, {
        source: 'auth',
        endpoint: 'login',
        email: loginDto.email,
      });
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refresh result',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        success: { type: 'boolean' },
      },
    },
  })
  async refreshToken(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string; success: boolean }> {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (!refreshToken) {
      return { message: 'No refresh token provided', success: false };
    }

    try {
      const tokens = await this.authService.refreshToken({ refreshToken });
      this.authService.setAuthCookies(res, tokens);
      return { message: 'Token refreshed successfully', success: true };
    } catch (error) {
      console.error('Failed to refresh token', error as Error, {
        source: 'auth',
        endpoint: 'refresh',
      });
      return { message: 'Invalid refresh token', success: false };
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 3, ttl: 300000 } }) // 3 password reset requests per 5 minutes
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
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 300000 } }) // 5 password reset attempts per 5 minutes
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
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponse> {
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
  async enableTwoFactor(
    @Request() req: AuthenticatedRequest,
  ): Promise<TwoFactorEnableResponse> {
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
        forceLogout: { type: 'boolean' },
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
    @Request() req: AuthenticatedRequest,
    @Body() twoFactorDisableDto: SimpleTwoFactorDisableDto,
  ): Promise<TwoFactorDisableResponse> {
    return this.simpleTwoFactorService.disableTwoFactor(
      req.user.sub,
      twoFactorDisableDto.currentPassword,
    );
  }

  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60000 } }) // 10 2FA attempts per minute
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
  @UsePipes(new ZodValidationPipe(TwoFactorCodeSchema))
  async twoFactorLogin(
    @Body() twoFactorLoginDto: TwoFactorCodeDto,
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResult> {
    const result = await this.authService.twoFactorLogin(
      twoFactorLoginDto.userId,
      twoFactorLoginDto,
      req,
    );

    // If login was successful and tokens were generated, set them as HTTP-only cookies
    if (result.tokens) {
      this.authService.setAuthCookies(res, result.tokens);
      // Remove tokens from response body for security
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tokens: _, ...responseWithoutTokens } = result;
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
  async logout(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponse> {
    try {
      const refreshToken = req.cookies?.refreshToken as string | undefined;

      if (refreshToken) {
        // Invalidate the refresh token
        await this.authService.invalidateRefreshToken(refreshToken);
      }

      // Clear cookies regardless of whether refresh token exists
      this.authService.clearAuthCookies(res);

      return { message: 'Logged out successfully' };
    } catch (error) {
      console.error('Failed to logout', error as Error, {
        source: 'auth',
        endpoint: 'logout',
      });
      // Still clear cookies even if token invalidation fails
      this.authService.clearAuthCookies(res);

      return { message: 'Logged out successfully' };
    }
  }
}

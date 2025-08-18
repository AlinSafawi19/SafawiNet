import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { RecoveryService } from './recovery.service';
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
  RecoveryRequestSchema,
  RecoveryConfirmSchema,
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
  RecoveryRequestDto,
  RecoveryConfirmDto,
} from './schemas/auth.schemas';
import { z } from 'zod';

@ApiTags('Authentication')
@Controller('v1/auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly recoveryService: RecoveryService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    description: 'User registration data',
    examples: {
      register: {
        summary: 'Register a new user',
        value: {
          email: 'john.doe@example.com',
          password: 'securePassword123',
          name: 'John Doe'
        }
      }
    }
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
  @Throttle({ default: { limit: 10, ttl: 300000 } }) // 10 requests per 5 minutes
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
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({
    description: 'User login credentials',
    examples: {
      login: {
        summary: 'Login with email and password',
        value: {
          email: 'john.doe@example.com',
          password: 'securePassword123'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
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
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    description: 'Refresh token data',
    examples: {
      refreshToken: {
        summary: 'Refresh access token',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 requests per 5 minutes (brute-force protection)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({
    description: 'Password reset request data',
    examples: {
      forgotPassword: {
        summary: 'Request password reset',
        value: {
          email: 'john.doe@example.com'
        }
      }
    }
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
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({
    description: 'Password reset data',
    examples: {
      resetPassword: {
        summary: 'Reset password with token',
        value: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          password: 'newSecurePassword123',
          confirmPassword: 'newSecurePassword123'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
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

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Setup two-factor authentication',
    description: 'Initialize 2FA setup for the authenticated user. Requires a valid JWT token in the Authorization header. The user is identified from the JWT token.'
  })
  @ApiBody({
    description: 'No request body required - user is identified from JWT token',
    examples: {
      setup2FA: {
        summary: 'Setup 2FA (no body required)',
        value: {}
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '2FA setup successful',
    schema: {
      type: 'object',
      properties: {
        secret: { type: 'string', description: 'TOTP secret (display once)' },
        qrCode: { type: 'string', description: 'QR code data URL' },
        otpauthUrl: { type: 'string', description: 'otpauth URL for authenticator apps' },
        backupCodes: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Backup codes (display once, store securely)' 
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '2FA already enabled or setup not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @UsePipes(new ZodValidationPipe(TwoFactorSetupSchema))
  async setupTwoFactor(@Request() req, @Body() twoFactorSetupDto: TwoFactorSetupDto) {
    return this.twoFactorService.setupTwoFactor(req.user.sub);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Enable two-factor authentication',
    description: 'Enable 2FA for the authenticated user using a TOTP code. Requires a valid JWT token in the Authorization header.'
  })
  @ApiBody({
    description: '2FA enable data',
    examples: {
      enable2FA: {
        summary: 'Enable 2FA with TOTP code',
        value: {
          code: '123456'
        }
      }
    }
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
    description: '2FA already enabled or setup not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid TOTP code or unauthorized - Invalid or missing JWT token',
  })
  @UsePipes(new ZodValidationPipe(TwoFactorEnableSchema))
  async enableTwoFactor(@Request() req, @Body() twoFactorEnableDto: TwoFactorEnableDto) {
    return this.twoFactorService.enableTwoFactor(req.user.sub, twoFactorEnableDto.code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Disable two-factor authentication',
    description: 'Disable 2FA for the authenticated user using a TOTP or backup code. Requires a valid JWT token in the Authorization header.'
  })
  @ApiBody({
    description: '2FA disable data',
    examples: {
      disable2FA: {
        summary: 'Disable 2FA with TOTP or backup code',
        value: {
          code: '123456'
        }
      }
    }
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
    description: 'Invalid code or unauthorized - Invalid or missing JWT token',
  })
  @UsePipes(new ZodValidationPipe(TwoFactorDisableSchema))
  async disableTwoFactor(@Request() req, @Body() twoFactorDisableDto: TwoFactorDisableDto) {
    return this.twoFactorService.disableTwoFactor(req.user.sub, twoFactorDisableDto.code);
  }

  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: 'Complete login with 2FA code' })
  @ApiBody({
    description: '2FA login data',
    examples: {
      twoFactorLogin: {
        summary: 'Complete login with TOTP or backup code',
        value: {
          userId: 'user_id_from_previous_login',
          code: '123456'
        }
      }
    }
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
  async twoFactorLogin(@Body() twoFactorLoginDto: TwoFactorLoginDto) {
    return this.authService.twoFactorLogin(twoFactorLoginDto.userId, twoFactorLoginDto);
  }

  @Post('recover/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 requests per 5 minutes
  @ApiOperation({ 
    summary: 'Request account recovery via recovery email',
    description: 'Request account recovery by sending a recovery token to the recovery email address. This is used when users lose access to their primary email or 2FA device.'
  })
  @ApiBody({
    description: 'Recovery request data',
    examples: {
      recoveryRequest: {
        summary: 'Request account recovery',
        value: {
          recoveryEmail: 'recovery@example.com'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Recovery request processed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        recoveryEmail: { type: 'string' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(RecoveryRequestSchema))
  async requestRecovery(@Body() recoveryRequestDto: RecoveryRequestDto) {
    return this.recoveryService.requestRecovery(recoveryRequestDto.recoveryEmail);
  }

  @Post('recover/confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @ApiOperation({ 
    summary: 'Confirm account recovery and stage new email',
    description: 'Confirm account recovery using the recovery token and stage a new email address. A verification email will be sent to the new email address.'
  })
  @ApiBody({
    description: 'Recovery confirmation data',
    examples: {
      recoveryConfirm: {
        summary: 'Confirm recovery and stage new email',
        value: {
          token: 'recovery_token_from_email',
          newEmail: 'newemail@example.com'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Recovery confirmed, verification required',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        newEmail: { type: 'string' },
        requiresVerification: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid recovery token or email already in use',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired recovery token',
  })
  @UsePipes(new ZodValidationPipe(RecoveryConfirmSchema))
  async confirmRecovery(@Body() recoveryConfirmDto: RecoveryConfirmDto) {
    return this.recoveryService.confirmRecovery(recoveryConfirmDto.token, recoveryConfirmDto.newEmail);
  }

  @Post('recover/complete')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @ApiOperation({ 
    summary: 'Complete account recovery and update email',
    description: 'Complete account recovery by verifying the new email address and updating the user account. This finalizes the email change process.'
  })
  @ApiBody({
    description: 'Recovery completion data',
    examples: {
      recoveryComplete: {
        summary: 'Complete recovery with verification token',
        value: {
          token: 'verification_token_from_new_email'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Account recovery completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired verification token',
  })
  @ApiResponse({
    status: 400,
    description: 'No recovery staging found or new email not set',
  })
  @UsePipes(new ZodValidationPipe(z.object({ token: z.string() })))
  async completeRecovery(@Body() body: { token: string }) {
    return this.recoveryService.completeRecovery(body.token);
  }
}

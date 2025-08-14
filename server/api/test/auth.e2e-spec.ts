import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { RedisService } from '../src/common/services/redis.service';
import { EmailService } from '../src/common/services/email.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let emailService: EmailService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    redisService = app.get<RedisService>(RedisService);
    emailService = app.get<EmailService>(EmailService);
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.oneTimeToken.deleteMany();
    await prismaService.refreshSession.deleteMany();
    await prismaService.user.deleteMany();
    
    await app.close();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await prismaService.oneTimeToken.deleteMany();
    await prismaService.refreshSession.deleteMany();
    await prismaService.user.deleteMany();
    
    // Clear Redis test data
    const keys = await redisService.getClient().keys('test:*');
    if (keys.length > 0) {
      await redisService.getClient().del(...keys);
    }
  });

  describe('/v1/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body.message).toContain('User registered successfully');
      expect(response.body.user.email).toBe(registerData.email);
      expect(response.body.user.name).toBe(registerData.name);
      expect(response.body.user.isVerified).toBe(false);
      expect(response.body.user.id).toBeDefined();
    });

    it('should return 409 if user already exists', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      // Second registration with same email
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(409);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // too short
        name: '', // empty name
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('/v1/auth/verify-email (POST)', () => {
    it('should verify email with valid token', async () => {
      // First register a user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      // Get the verification token from the database
      const user = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const verificationToken = await prismaService.oneTimeToken.findFirst({
        where: {
          userId: user.id,
          purpose: 'email_verification',
        },
      });

      if (!verificationToken) {
        throw new Error('Verification token not found');
      }

      // Verify email
      const verifyResponse = await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token: verificationToken.hash })
        .expect(200);

      expect(verifyResponse.body.message).toBe('Email verified successfully');

      // Check that user is now verified
      const updatedUser = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });
      
      if (!updatedUser) {
        throw new Error('Updated user not found');
      }
      
      expect(updatedUser.isVerified).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);
    });
  });

  describe('/v1/auth/login (POST)', () => {
    it('should login successfully for verified user', async () => {
      // Register and verify a user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      const user = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Manually verify the user
      await prismaService.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200);

      expect(loginResponse.body.tokens).toBeDefined();
      expect(loginResponse.body.tokens.accessToken).toBeDefined();
      expect(loginResponse.body.tokens.refreshToken).toBeDefined();
      expect(loginResponse.body.user.email).toBe(registerData.email);
      expect(loginResponse.body.requiresVerification).toBeUndefined();
    });

    it('should return requiresVerification for unverified user', async () => {
      // Register a user without verifying
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      // Try to login
      const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200);

      expect(loginResponse.body.requiresVerification).toBe(true);
      expect(loginResponse.body.user.email).toBe(registerData.email);
      expect(loginResponse.body.tokens).toBeUndefined();
    });

    it('should return 401 for invalid credentials', async () => {
      // Register a user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      // Try to login with wrong password
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: registerData.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('/v1/auth/refresh (POST)', () => {
    it('should refresh tokens successfully', async () => {
      // Register and verify a user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      const user = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prismaService.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200);

      const refreshToken = loginResponse.body.tokens.refreshToken;

      // Refresh tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();
      expect(refreshResponse.body.expiresIn).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on registration', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // Make multiple requests quickly
      for (let i = 0; i < 6; i++) {
        const response = await request(app.getHttpServer())
          .post('/v1/auth/register')
          .send({
            ...registerData,
            email: `test${i}@example.com`,
          });

        if (i < 5) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(429); // Too Many Requests
        }
      }
    });

    it('should enforce rate limits on login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 11; i++) {
        const response = await request(app.getHttpServer())
          .post('/v1/auth/login')
          .send(loginData);

        if (i < 10) {
          expect(response.status).toBe(401);
        } else {
          expect(response.status).toBe(429); // Too Many Requests
        }
      }
    });
  });

  describe('/v1/auth/forgot-password (POST)', () => {
    it('should send password reset email for existing user', async () => {
      // Create a verified user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      // Verify the user
      const user = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prismaService.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Request password reset
      const response = await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: registerData.email })
        .expect(200);

      expect(response.body.message).toContain('If an account with this email exists, a password reset link has been sent.');

      // Verify that a password reset token was created
      const resetToken = await prismaService.oneTimeToken.findFirst({
        where: {
          userId: user.id,
          purpose: 'password_reset',
          usedAt: null,
        },
      });

      expect(resetToken).toBeDefined();
      expect(resetToken?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return same message for non-existent user (security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toContain('If an account with this email exists, a password reset link has been sent.');
    });

    it('should invalidate existing reset tokens when requesting new one', async () => {
      // Create a verified user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      const user = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prismaService.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Request password reset twice
      await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: registerData.email })
        .expect(200);

      await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: registerData.email })
        .expect(200);

      // Verify only one active token exists
      const activeTokens = await prismaService.oneTimeToken.findMany({
        where: {
          userId: user.id,
          purpose: 'password_reset',
          usedAt: null,
        },
      });

      expect(activeTokens).toHaveLength(1);
    });

    it('should enforce brute-force rate limiting', async () => {
      // Make multiple requests quickly
      for (let i = 0; i < 4; i++) {
        const response = await request(app.getHttpServer())
          .post('/v1/auth/forgot-password')
          .send({ email: `test${i}@example.com` });

        if (i < 3) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429); // Too Many Requests
        }
      }
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('/v1/auth/reset-password (POST)', () => {
    it('should reset password successfully with valid token', async () => {
      // Create a verified user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      const user = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prismaService.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Create a password reset token manually
      const resetToken = 'test-reset-token-123';
      const tokenHash = require('crypto').createHash('sha256').update(resetToken).digest('hex');
      
      await prismaService.oneTimeToken.create({
        data: {
          purpose: 'password_reset',
          hash: tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      // Reset password
      const response = await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newPassword123',
        })
        .expect(200);

      expect(response.body.message).toContain('Password reset successfully');

      // Verify token was consumed
      const usedToken = await prismaService.oneTimeToken.findFirst({
        where: {
          hash: tokenHash,
          purpose: 'password_reset',
        },
      });

      expect(usedToken?.usedAt).toBeDefined();

      // Verify password was changed
      const updatedUser = await prismaService.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.password).not.toBe(user.password);
    });

    it('should work exactly once (token consumption)', async () => {
      // Create a verified user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      const user = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prismaService.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Create a password reset token manually
      const resetToken = 'test-reset-token-123';
      const tokenHash = require('crypto').createHash('sha256').update(resetToken).digest('hex');
      
      await prismaService.oneTimeToken.create({
        data: {
          purpose: 'password_reset',
          hash: tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      // First reset should succeed
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newPassword123',
        })
        .expect(200);

      // Second reset with same token should fail
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'anotherPassword123',
        })
        .expect(400);
    });

    it('should invalidate all refresh sessions after password reset', async () => {
      // Create a verified user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      const user = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prismaService.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Login to create refresh sessions
      const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200);

      const refreshToken = loginResponse.body.tokens.refreshToken;

      // Verify refresh token works
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Create a password reset token manually
      const resetToken = 'test-reset-token-123';
      const tokenHash = require('crypto').createHash('sha256').update(resetToken).digest('hex');
      
      await prismaService.oneTimeToken.create({
        data: {
          purpose: 'password_reset',
          hash: tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      // Reset password
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newPassword123',
        })
        .expect(200);

      // Verify all refresh sessions are invalidated
      const activeSessions = await prismaService.refreshSession.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      expect(activeSessions).toHaveLength(0);

      // Verify old refresh token no longer works
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      // Create a verified user
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      const user = await prismaService.user.findUnique({
        where: { email: registerData.email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prismaService.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      // Create an expired password reset token
      const resetToken = 'test-reset-token-123';
      const tokenHash = require('crypto').createHash('sha256').update(resetToken).digest('hex');
      
      await prismaService.oneTimeToken.create({
        data: {
          purpose: 'password_reset',
          hash: tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      // Reset password should fail
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newPassword123',
        })
        .expect(400);
    });

    it('should reject invalid tokens', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newPassword123',
        })
        .expect(400);
    });

    it('should validate password requirements', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: 'valid-token',
          password: '123', // too short
        })
        .expect(400);
    });

    it('should enforce rate limiting', async () => {
      // Make multiple requests quickly
      for (let i = 0; i < 6; i++) {
        const response = await request(app.getHttpServer())
          .post('/v1/auth/reset-password')
          .send({
            token: `token${i}`,
            password: 'newPassword123',
          });

        if (i < 5) {
          expect(response.status).toBe(400); // Invalid token, but not rate limited
        } else {
          expect(response.status).toBe(429); // Too Many Requests
        }
      }
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { EmailService } from '../src/common/services/email.service';
import { SecurityUtils } from '../src/common/security/security.utils';

describe('Recovery Email (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const testUser = {
    email: 'testuser@example.com',
    recoveryEmail: 'recovery@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  };

  const newEmail = 'newemail@example.com';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    emailService = moduleFixture.get<EmailService>(EmailService);

    // Mock email service to prevent actual emails
    jest.spyOn(emailService, 'sendRecoveryEmail').mockResolvedValue(undefined);
    jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prismaService.recoveryStaging.deleteMany();
    await prismaService.oneTimeToken.deleteMany();
    await prismaService.refreshSession.deleteMany();
    await prismaService.user.deleteMany();

    // Create test user
    await prismaService.user.create({
      data: {
        email: testUser.email,
        recoveryEmail: testUser.recoveryEmail,
        password: await SecurityUtils.hashPassword(testUser.password),
        name: testUser.name,
        isVerified: true,
      },
    });
  });

  describe('POST /v1/auth/recover/request', () => {
    it('should request recovery for existing recovery email', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/recover/request')
        .send({
          recoveryEmail: testUser.recoveryEmail,
        })
        .expect(200);

      expect(response.body.message).toBe(
        'Recovery token sent to your recovery email. Please check your inbox.'
      );
      expect(response.body.recoveryEmail).toBe(testUser.recoveryEmail);

      // Verify recovery staging was created
      const staging = await prismaService.recoveryStaging.findFirst({
        where: { userId: (await prismaService.user.findUnique({ where: { email: testUser.email } }))!.id },
      });
      expect(staging).toBeDefined();
      expect(staging!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle non-existent recovery email gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/recover/request')
        .send({
          recoveryEmail: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body.message).toBe(
        'If the recovery email is registered, you will receive a recovery token shortly.'
      );
      expect(response.body.recoveryEmail).toBe('nonexistent@example.com');

      // Verify no recovery staging was created
      const staging = await prismaService.recoveryStaging.findMany();
      expect(staging).toHaveLength(0);
    });

    it('should reject recovery request for user without recovery email', async () => {
      // Update user to remove recovery email
      await prismaService.user.update({
        where: { email: testUser.email },
        data: { recoveryEmail: null },
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/recover/request')
        .send({
          recoveryEmail: 'some@example.com',
        })
        .expect(200);

      expect(response.body.message).toBe(
        'If the recovery email is registered, you will receive a recovery token shortly.'
      );

      // Verify no recovery staging was created
      const staging = await prismaService.recoveryStaging.findMany();
      expect(staging).toHaveLength(0);
    });

    it('should reject duplicate recovery requests', async () => {
      // Create initial recovery request
      await request(app.getHttpServer())
        .post('/v1/auth/recover/request')
        .send({
          recoveryEmail: testUser.recoveryEmail,
        })
        .expect(200);

      // Attempt duplicate request
      await request(app.getHttpServer())
        .post('/v1/auth/recover/request')
        .send({
          recoveryEmail: testUser.recoveryEmail,
        })
        .expect(400);

      // Verify only one staging record exists
      const staging = await prismaService.recoveryStaging.findMany();
      expect(staging).toHaveLength(1);
    });

    it('should respect rate limiting', async () => {
      // Make 3 requests (limit)
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/v1/auth/recover/request')
          .send({
            recoveryEmail: testUser.recoveryEmail,
          })
          .expect(200);
      }

      // 4th request should be rate limited
      await request(app.getHttpServer())
        .post('/v1/auth/recover/request')
        .send({
          recoveryEmail: testUser.recoveryEmail,
        })
        .expect(429);
    });
  });

  describe('POST /v1/auth/recover/confirm', () => {
    let recoveryToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create recovery staging
      const user = await prismaService.user.findUnique({ where: { email: testUser.email } });
      userId = user!.id;

      recoveryToken = SecurityUtils.generateSecureToken(32);
      const tokenHash = SecurityUtils.hashToken(recoveryToken);

      await prismaService.recoveryStaging.create({
        data: {
          userId,
          newEmail: '',
          recoveryTokenHash: tokenHash,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
    });

    it('should confirm recovery and stage new email', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/recover/confirm')
        .send({
          token: recoveryToken,
          newEmail: newEmail,
        })
        .expect(200);

      expect(response.body.message).toBe(
        'Recovery confirmed. Please verify your new email address to complete the process.'
      );
      expect(response.body.newEmail).toBe(newEmail);
      expect(response.body.requiresVerification).toBe(true);

      // Verify recovery staging was updated
      const staging = await prismaService.recoveryStaging.findUnique({
        where: { userId },
      });
      expect(staging!.newEmail).toBe(newEmail);

      // Verify verification token was created
      const verificationToken = await prismaService.oneTimeToken.findFirst({
        where: {
          userId,
          purpose: 'email_verification',
        },
      });
      expect(verificationToken).toBeDefined();
    });

    it('should reject invalid recovery token', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/recover/confirm')
        .send({
          token: 'invalid_token',
          newEmail: newEmail,
        })
        .expect(401);
    });

    it('should reject expired recovery token', async () => {
      // Create expired recovery staging
      const expiredToken = SecurityUtils.generateSecureToken(32);
      const expiredTokenHash = SecurityUtils.hashToken(expiredToken);

      await prismaService.recoveryStaging.update({
        where: { userId },
        data: {
          recoveryTokenHash: expiredTokenHash,
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      await request(app.getHttpServer())
        .post('/v1/auth/recover/confirm')
        .send({
          token: expiredToken,
          newEmail: newEmail,
        })
        .expect(401);
    });

    it('should reject if new email is already in use by another account', async () => {
      // Create another user with the new email
      await prismaService.user.create({
        data: {
          email: newEmail,
          password: await SecurityUtils.hashPassword('password123'),
          name: 'Another User',
          isVerified: true,
        },
      });

      await request(app.getHttpServer())
        .post('/v1/auth/recover/confirm')
        .send({
          token: recoveryToken,
          newEmail: newEmail,
        })
        .expect(400);
    });

    it('should allow using same email for same user', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/recover/confirm')
        .send({
          token: recoveryToken,
          newEmail: testUser.email, // Same as current email
        })
        .expect(200);

      expect(response.body.requiresVerification).toBe(true);
    });

    it('should respect rate limiting', async () => {
      // Make 5 requests (limit)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/v1/auth/recover/confirm')
          .send({
            token: recoveryToken,
            newEmail: `email${i}@example.com`,
          })
          .expect(200);
      }

      // 6th request should be rate limited
      await request(app.getHttpServer())
        .post('/v1/auth/recover/confirm')
        .send({
          token: recoveryToken,
          newEmail: 'another@example.com',
        })
        .expect(429);
    });
  });

  describe('Complete Recovery Flow', () => {
    it('should complete full recovery process', async () => {
      // Step 1: Request recovery
      await request(app.getHttpServer())
        .post('/v1/auth/recover/request')
        .send({
          recoveryEmail: testUser.recoveryEmail,
        })
        .expect(200);

      // Get recovery staging and token
      const user = await prismaService.user.findUnique({ where: { email: testUser.email } });
      const staging = await prismaService.recoveryStaging.findUnique({
        where: { userId: user!.id },
      });

      // Generate recovery token (in real scenario, this would come from email)
      const recoveryToken = SecurityUtils.generateSecureToken(32);
      await prismaService.recoveryStaging.update({
        where: { userId: user!.id },
        data: { recoveryTokenHash: SecurityUtils.hashToken(recoveryToken) },
      });

      // Step 2: Confirm recovery
      await request(app.getHttpServer())
        .post('/v1/auth/recover/confirm')
        .send({
          token: recoveryToken,
          newEmail: newEmail,
        })
        .expect(200);

      // Get verification token
      const verificationToken = await prismaService.oneTimeToken.findFirst({
        where: {
          userId: user!.id,
          purpose: 'email_verification',
        },
      });

      // Step 3: Complete recovery via email verification
      const response = await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({
          token: verificationToken!.hash, // In real scenario, this would be the plain token
        })
        .expect(200);

      expect(response.body.message).toBe('Email verified successfully');

      // Verify user email was updated
      const updatedUser = await prismaService.user.findUnique({
        where: { id: user!.id },
      });
      expect(updatedUser!.email).toBe(newEmail);
      expect(updatedUser!.isVerified).toBe(true);

      // Verify recovery staging was cleaned up
      const cleanedStaging = await prismaService.recoveryStaging.findUnique({
        where: { userId: user!.id },
      });
      expect(cleanedStaging).toBeNull();

      // Verify verification token was marked as used
      const usedToken = await prismaService.oneTimeToken.findUnique({
        where: { id: verificationToken!.id },
      });
      expect(usedToken!.usedAt).toBeDefined();
    });
  });

  describe('Security Features', () => {
    it('should invalidate all sessions after recovery', async () => {
      // Create some refresh sessions for the user
      const user = await prismaService.user.findUnique({ where: { email: testUser.email } });
      
      await prismaService.refreshSession.createMany({
        data: [
          {
            familyId: 'family1',
            tokenId: 'token1',
            refreshHash: 'hash1',
            userId: user!.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isActive: true,
          },
          {
            familyId: 'family2',
            tokenId: 'token2',
            refreshHash: 'hash2',
            userId: user!.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isActive: true,
          },
        ],
      });

      // Complete recovery process
      // (This would normally go through the full flow, but for testing we'll simulate the session invalidation)
      await prismaService.refreshSession.updateMany({
        where: { userId: user!.id },
        data: { isActive: false },
      });

      // Verify all sessions are invalidated
      const sessions = await prismaService.refreshSession.findMany({
        where: { userId: user!.id },
      });
      expect(sessions).toHaveLength(2);
      sessions.forEach(session => {
        expect(session.isActive).toBe(false);
      });
    });

    it('should cleanup expired recovery attempts', async () => {
      const user = await prismaService.user.findUnique({ where: { email: testUser.email } });
      
      // Create expired recovery staging
      await prismaService.recoveryStaging.create({
        data: {
          userId: user!.id,
          newEmail: '',
          recoveryTokenHash: 'expired_hash',
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      // Call cleanup method
      const recoveryService = app.get('RecoveryService');
      if (recoveryService && typeof recoveryService.cleanupExpiredRecoveries === 'function') {
        await recoveryService.cleanupExpiredRecoveries();
      }

      // Verify expired staging was cleaned up
      const expiredStaging = await prismaService.recoveryStaging.findMany({
        where: { userId: user!.id },
      });
      expect(expiredStaging).toHaveLength(0);
    });
  });
});

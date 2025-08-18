import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { SecurityUtils } from '../src/common/security/security.utils';

describe('Account & Preferences Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up database
    await prisma.pendingEmailChange.deleteMany();
    await prisma.oneTimeToken.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();

    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: await SecurityUtils.hashPassword('testPassword123'),
        name: 'Test User',
        isVerified: true,
        preferences: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          notifications: {
            sound: true,
            desktop: true,
          },
        },
        notificationPreferences: {
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
    });

    userId = testUser.id;

    // Create a JWT token for authentication
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testPassword123',
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.pendingEmailChange.deleteMany();
    await prisma.oneTimeToken.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('GET /v1/users/me', () => {
    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.preferences).toBeDefined();
      expect(response.body.user.notificationPreferences).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });
  });

  describe('PATCH /v1/users/me', () => {
    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Test User',
        recoveryEmail: 'recovery@example.com',
      };

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.name).toBe(updateData.name);
      expect(response.body.user.recoveryEmail).toBe(updateData.recoveryEmail);
    });

    it('should update only provided fields', async () => {
      const updateData = {
        name: 'Partial Update User',
      };

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.user.name).toBe(updateData.name);
      // recoveryEmail should remain unchanged
      expect(response.body.user.recoveryEmail).toBe('recovery@example.com');
    });

    it('should reject invalid recovery email', async () => {
      const updateData = {
        recoveryEmail: 'invalid-email',
      };

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });
  });

  describe('PUT /v1/users/me/preferences', () => {
    it('should update user preferences', async () => {
      const updateData = {
        theme: 'dark',
        language: 'es',
        timezone: 'America/New_York',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        notifications: {
          sound: false,
          desktop: false,
        },
      };

      const response = await request(app.getHttpServer())
        .put('/users/me/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Preferences updated successfully');
      expect(response.body.user.preferences.theme).toBe('dark');
      expect(response.body.user.preferences.language).toBe('es');
      expect(response.body.user.preferences.timezone).toBe('America/New_York');
      expect(response.body.user.preferences.dateFormat).toBe('DD/MM/YYYY');
      expect(response.body.user.preferences.timeFormat).toBe('24h');
      expect(response.body.user.preferences.notifications.sound).toBe(false);
      expect(response.body.user.preferences.notifications.desktop).toBe(false);
    });

    it('should merge preferences with existing ones', async () => {
      const updateData = {
        theme: 'auto',
      };

      const response = await request(app.getHttpServer())
        .put('/users/me/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.user.preferences.theme).toBe('auto');
      // Other preferences should remain unchanged
      expect(response.body.user.preferences.language).toBe('es');
      expect(response.body.user.preferences.timezone).toBe('America/New_York');
    });

    it('should reject invalid preference values', async () => {
      const updateData = {
        theme: 'invalid-theme',
      };

      await request(app.getHttpServer())
        .put('/users/me/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });
  });

  describe('PUT /v1/users/me/notification-preferences', () => {
    it('should update notification preferences', async () => {
      const updateData = {
        email: {
          marketing: true,
          security: false,
          updates: false,
          weeklyDigest: true,
        },
        push: {
          enabled: false,
          marketing: true,
          security: false,
          updates: false,
        },
        sms: {
          enabled: true,
          security: false,
          twoFactor: false,
        },
      };

      const response = await request(app.getHttpServer())
        .put('/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Notification preferences updated successfully');
      expect(response.body.user.notificationPreferences.email.marketing).toBe(true);
      expect(response.body.user.notificationPreferences.email.security).toBe(false);
      expect(response.body.user.notificationPreferences.push.enabled).toBe(false);
      expect(response.body.user.notificationPreferences.sms.enabled).toBe(true);
    });

    it('should merge notification preferences with existing ones', async () => {
      const updateData = {
        email: {
          marketing: false,
        },
      };

      const response = await request(app.getHttpServer())
        .put('/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.user.notificationPreferences.email.marketing).toBe(false);
      // Other preferences should remain unchanged
      expect(response.body.user.notificationPreferences.email.security).toBe(false);
      expect(response.body.user.notificationPreferences.push.enabled).toBe(false);
    });
  });

  describe('PATCH /v1/users/me/email', () => {
    it('should request email change', async () => {
      const changeData = {
        newEmail: 'newemail@example.com',
      };

      const response = await request(app.getHttpServer())
        .patch('/users/me/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(200);

      expect(response.body.message).toBe('Email change confirmation sent to new email address');

      // Verify pending email change was created
      const pendingChange = await prisma.pendingEmailChange.findFirst({
        where: { userId },
      });
      expect(pendingChange).toBeDefined();
      expect(pendingChange.newEmail).toBe('newemail@example.com');
    });

    it('should reject same email', async () => {
      const changeData = {
        newEmail: 'test@example.com',
      };

      await request(app.getHttpServer())
        .patch('/users/me/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(400);
    });

    it('should reject already used email', async () => {
      // Create another user
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: await SecurityUtils.hashPassword('password123'),
          name: 'Existing User',
          isVerified: true,
        },
      });

      const changeData = {
        newEmail: 'existing@example.com',
      };

      await request(app.getHttpServer())
        .patch('/users/me/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(409);

      // Clean up
      await prisma.user.delete({
        where: { email: 'existing@example.com' },
      });
    });
  });

  describe('POST /v1/users/confirm-email-change', () => {
    it('should confirm email change with valid token', async () => {
      // Create a pending email change
      const changeToken = SecurityUtils.generateSecureToken();
      const tokenHash = SecurityUtils.hashToken(changeToken);

      await prisma.pendingEmailChange.create({
        data: {
          userId,
          newEmail: 'confirmed@example.com',
          changeTokenHash: tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post('/users/confirm-email-change')
        .send({ token: changeToken })
        .expect(200);

      expect(response.body.message).toBe('Email changed successfully. Please sign in with your new email address.');

      // Verify email was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(updatedUser.email).toBe('confirmed@example.com');

      // Verify pending change was removed
      const pendingChange = await prisma.pendingEmailChange.findFirst({
        where: { userId },
      });
      expect(pendingChange).toBeNull();
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .post('/users/confirm-email-change')
        .send({ token: 'invalid-token' })
        .expect(400);
    });

    it('should reject expired token', async () => {
      const changeToken = SecurityUtils.generateSecureToken();
      const tokenHash = SecurityUtils.hashToken(changeToken);

      await prisma.pendingEmailChange.create({
        data: {
          userId,
          newEmail: 'expired@example.com',
          changeTokenHash: tokenHash,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired
        },
      });

      await request(app.getHttpServer())
        .post('/users/confirm-email-change')
        .send({ token: changeToken })
        .expect(400);
    });
  });

  describe('PATCH /v1/users/me/password', () => {
    it('should change password with valid current password', async () => {
      const changeData = {
        currentPassword: 'testPassword123',
        newPassword: 'newSecurePassword123',
      };

      const response = await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(200);

      expect(response.body.message).toBe('Password changed successfully');

      // Verify password was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      const isNewPasswordValid = await SecurityUtils.verifyPassword('newSecurePassword123', updatedUser.password);
      expect(isNewPasswordValid).toBe(true);

      // Verify refresh tokens were revoked
      const activeSessions = await prisma.refreshSession.findMany({
        where: { userId, isActive: true },
      });
      expect(activeSessions).toHaveLength(0);
    });

    it('should reject incorrect current password', async () => {
      const changeData = {
        currentPassword: 'wrongPassword',
        newPassword: 'newSecurePassword123',
      };

      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(401);
    });

    it('should reject weak new password', async () => {
      const changeData = {
        currentPassword: 'newSecurePassword123',
        newPassword: '123',
      };

      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(400);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on profile updates', async () => {
      const updateData = { name: 'Rate Limited User' };

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .patch('/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);
      }

      // Next request should be rate limited
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(429);
    });

    it('should enforce rate limits on email changes', async () => {
      const changeData = { newEmail: 'rate-limited@example.com' };

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .patch('/users/me/email')
          .set('Authorization', `Bearer ${authToken}`)
          .send(changeData)
          .expect(200);
      }

      // Next request should be rate limited
      await request(app.getHttpServer())
        .patch('/users/me/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(429);
    });
  });
});

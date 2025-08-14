import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { SecurityUtils } from '../src/common/security/security.utils';
import * as speakeasy from 'speakeasy';

describe('2FA (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean up database
    await prismaService.backupCode.deleteMany();
    await prismaService.twoFactorSecret.deleteMany();
    await prismaService.refreshSession.deleteMany();
    await prismaService.oneTimeToken.deleteMany();
    await prismaService.user.deleteMany();

    // Create a test user
    const hashedPassword = await SecurityUtils.hashPassword('testPassword123');
    const user = await prismaService.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        isVerified: true,
      },
    });
    userId = user.id;

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testPassword123',
      });

    authToken = loginResponse.body.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/auth/2fa/setup', () => {
    it('should setup 2FA successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('otpauthUrl');
      expect(response.body).toHaveProperty('backupCodes');
      expect(response.body.backupCodes).toHaveLength(10);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/setup')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('POST /v1/auth/2fa/enable', () => {
    let secret: string;

    beforeEach(async () => {
      // Setup 2FA first
      const setupResponse = await request(app.getHttpServer())
        .post('/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      secret = setupResponse.body.secret;
    });

    it('should enable 2FA with valid TOTP code', async () => {
      // Generate valid TOTP code
      const totpCode = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: totpCode,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Two-factor authentication enabled successfully');

      // Verify user has 2FA enabled
      const user = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(user.twoFactorEnabled).toBe(true);
    });

    it('should return 401 with invalid TOTP code', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: '000000',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /v1/auth/2fa/disable', () => {
    let secret: string;
    let backupCodes: string[];

    beforeEach(async () => {
      // Setup and enable 2FA
      const setupResponse = await request(app.getHttpServer())
        .post('/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      secret = setupResponse.body.secret;
      backupCodes = setupResponse.body.backupCodes;

      // Enable 2FA
      const totpCode = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await request(app.getHttpServer())
        .post('/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: totpCode,
        });
    });

    it('should disable 2FA with valid TOTP code', async () => {
      const totpCode = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: totpCode,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Two-factor authentication disabled successfully');

      // Verify user has 2FA disabled
      const user = await prismaService.user.findUnique({
        where: { id: userId },
      });
      expect(user.twoFactorEnabled).toBe(false);
    });

    it('should disable 2FA with valid backup code', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: backupCodes[0],
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Two-factor authentication disabled successfully');

      // Verify backup code is marked as used
      const backupCode = await prismaService.backupCode.findFirst({
        where: { userId },
      });
      expect(backupCode.isUsed).toBe(true);
    });

    it('should return 401 with invalid code', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'INVALID',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /v1/auth/2fa/login', () => {
    let secret: string;
    let backupCodes: string[];

    beforeEach(async () => {
      // Setup and enable 2FA
      const setupResponse = await request(app.getHttpServer())
        .post('/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      secret = setupResponse.body.secret;
      backupCodes = setupResponse.body.backupCodes;

      // Enable 2FA
      const totpCode = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await request(app.getHttpServer())
        .post('/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: totpCode,
        });
    });

    it('should complete login with valid TOTP code', async () => {
      const totpCode = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/login')
        .send({
          userId,
          code: totpCode,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.twoFactorEnabled).toBe(true);
    });

    it('should complete login with valid backup code', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/login')
        .send({
          userId,
          code: backupCodes[0],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body).toHaveProperty('user');

      // Verify backup code is marked as used
      const backupCode = await prismaService.backupCode.findFirst({
        where: { userId },
      });
      expect(backupCode.isUsed).toBe(true);
    });

    it('should return 401 with invalid code', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/2fa/login')
        .send({
          userId,
          code: 'INVALID',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Login flow with 2FA', () => {
    let secret: string;

    beforeEach(async () => {
      // Setup and enable 2FA
      const setupResponse = await request(app.getHttpServer())
        .post('/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      secret = setupResponse.body.secret;

      // Enable 2FA
      const totpCode = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await request(app.getHttpServer())
        .post('/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: totpCode,
        });
    });

    it('should require 2FA code after password verification', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body.user.id).toBe(userId);
      expect(response.body.tokens).toBeUndefined();
    });
  });
});

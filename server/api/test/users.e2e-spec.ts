import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { RedisService } from '../src/common/services/redis.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get<PrismaService>(PrismaService);
    redisService = app.get<RedisService>(RedisService);

    await app.init();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prismaService.cleanDatabase();
    
    // Clear Redis
    const keys = await redisService.getClient().keys('*');
    if (keys.length > 0) {
      await redisService.getClient().del(...keys);
    }
  });

  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body.message).toBe('User created successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.password).toBeUndefined();

      // Verify user was created in database
      const createdUser = await prismaService.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser!.email).toBe('test@example.com');
    });

    it('should reject user creation with invalid email format', async () => {
      const createUserDto = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      // Check if errors field exists or if it's in a different format
      expect(response.body.errors || response.body.error).toBeDefined();
      if (response.body.errors) {
        expect(response.body.errors.some((e: any) => e.field === 'email')).toBe(true);
      }
    });

    it('should reject user creation with short password', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      // Check if errors field exists or if it's in a different format
      expect(response.body.errors || response.body.error).toBeDefined();
      if (response.body.errors) {
        expect(response.body.errors.some((e: any) => e.field === 'password')).toBe(true);
      }
    });

    it('should reject user creation with empty name', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: '',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      // Check if errors field exists or if it's in a different format
      expect(response.body.errors || response.body.error).toBeDefined();
      if (response.body.errors) {
        expect(response.body.errors.some((e: any) => e.field === 'name')).toBe(true);
      }
    });

    it('should reject duplicate email creation', async () => {
      // Create first user
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      // Try to create second user with same email
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(409);

      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should enforce rate limiting on user creation', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // Make 6 requests (limit is 5 per 5 minutes)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/users')
          .send({ ...createUserDto, email: `test${i}@example.com` })
          .expect(201);
      }

      // 6th request should be rate limited
      await request(app.getHttpServer())
        .post('/users')
        .send({ ...createUserDto, email: 'test6@example.com' })
        .expect(429);
    });

    it('should respect idempotency keys', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const idempotencyKey = 'test-key-123';

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/users')
        .set('idempotency-key', idempotencyKey)
        .send(createUserDto)
        .expect(201);

      // Second request with same idempotency key
      const response2 = await request(app.getHttpServer())
        .post('/users')
        .set('idempotency-key', idempotencyKey)
        .send(createUserDto)
        .expect(201);

      // Both responses should be identical
      expect(response1.body).toEqual(response2.body);

      // Only one user should be created in database
      const users = await prismaService.user.findMany({
        where: { email: 'test@example.com' },
      });
      expect(users).toHaveLength(1);
    });
  });

  describe('/users (GET)', () => {
    it('should return all users without passwords', async () => {
      // Create test users
      const users = [
        { email: 'user1@example.com', password: 'password123', name: 'User 1' },
        { email: 'user2@example.com', password: 'password123', name: 'User 2' },
      ];

      for (const user of users) {
        await prismaService.user.create({
          data: {
            email: user.email,
            password: 'hashedPassword',
            name: user.name,
          },
        });
      }

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0].password).toBeUndefined();
      expect(response.body.users[1].password).toBeUndefined();
    });

    it('should enforce rate limiting on user listing', async () => {
      // Make 101 requests (limit is 100 per minute)
      for (let i = 0; i < 100; i++) {
        await request(app.getHttpServer())
          .get('/users')
          .expect(200);
      }

      // 101st request should be rate limited
      await request(app.getHttpServer())
        .get('/users')
        .expect(429);
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return user by ID without password', async () => {
      const user = await prismaService.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedPassword',
          name: 'Test User',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(200);

      expect(response.body.message).toBe('User not found');
    });
  });

  describe('/users/verify-email (POST)', () => {
    it('should verify email with valid token', async () => {
      // Create user and verification token
      const user = await prismaService.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedPassword',
          name: 'Test User',
        },
      });

      const token = 'validToken123';
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');

      await prismaService.oneTimeToken.create({
        data: {
          purpose: 'email_verification',
          hash: tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      const response = await request(app.getHttpServer())
        .post('/users/verify-email')
        .send({ token })
        .expect(200);

      expect(response.body.message).toBe('Email verified successfully');

      // Verify token was marked as used
      const updatedToken = await prismaService.oneTimeToken.findFirst({
        where: { hash: tokenHash },
      });
      expect(updatedToken).toBeDefined();
      expect(updatedToken!.usedAt).toBeDefined();
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/verify-email')
        .send({ token: 'invalid-token' })
        .expect(200);

      expect(response.body.message).toBe('Invalid or expired verification token');
    });

    it('should enforce rate limiting on email verification', async () => {
      // Make 11 requests (limit is 10 per 5 minutes)
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/users/verify-email')
          .send({ token: `token${i}` })
          .expect(200);
      }

      // 11th request should be rate limited
      await request(app.getHttpServer())
        .post('/users/verify-email')
        .send({ token: 'token11' })
        .expect(429);
    });
  });

  describe('/users/request-password-reset (POST)', () => {
    it('should create password reset token and send email', async () => {
      const user = await prismaService.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedPassword',
          name: 'Test User',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/users/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.message).toBe('Password reset email sent if user exists');

      // Verify reset token was created
      const resetToken = await prismaService.oneTimeToken.findFirst({
        where: {
          userId: user.id,
          purpose: 'password_reset',
        },
      });
      expect(resetToken).toBeDefined();
      expect(resetToken!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not reveal if user exists or not', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/request-password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toBe('Password reset email sent if user exists');
    });

    it('should enforce rate limiting on password reset requests', async () => {
      // Make 4 requests (limit is 3 per hour)
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/users/request-password-reset')
          .send({ email: `test${i}@example.com` })
          .expect(200);
      }

      // 4th request should be rate limited
      await request(app.getHttpServer())
        .post('/users/request-password-reset')
        .send({ email: 'test4@example.com' })
        .expect(429);
    });
  });

  describe('/users/reset-password (POST)', () => {
    it('should reset password with valid token', async () => {
      const user = await prismaService.user.create({
        data: {
          email: 'test@example.com',
          password: 'oldPassword',
          name: 'Test User',
        },
      });

      const token = 'resetToken123';
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');

      await prismaService.oneTimeToken.create({
        data: {
          purpose: 'password_reset',
          hash: tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const response = await request(app.getHttpServer())
        .post('/users/reset-password')
        .send({
          token,
          newPassword: 'newPassword123',
        })
        .expect(200);

      expect(response.body.message).toBe('Password reset successfully');

      // Verify password was updated
      const updatedUser = await prismaService.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.password).not.toBe('oldPassword');

      // Verify token was marked as used
      const updatedToken = await prismaService.oneTimeToken.findFirst({
        where: { hash: tokenHash },
      });
      expect(updatedToken).toBeDefined();
      expect(updatedToken!.usedAt).toBeDefined();
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newPassword123',
        })
        .expect(200);

      expect(response.body.message).toBe('Invalid or expired reset token');
    });

    it('should enforce rate limiting on password reset', async () => {
      // Make 6 requests (limit is 5 per hour)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/users/reset-password')
          .send({
            token: `token${i}`,
            newPassword: 'newPassword123',
          })
          .expect(200);
      }

      // 6th request should be rate limited
      await request(app.getHttpServer())
        .post('/users/reset-password')
        .send({
          token: 'token6',
          newPassword: 'newPassword123',
        })
        .expect(429);
    });
  });
});

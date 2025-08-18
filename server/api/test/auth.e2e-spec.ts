import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { app, prismaService } from './jest-e2e.setup';
import { AuthService } from '../src/auth/auth.service';
import { EmailService } from '../src/common/services/email.service';

describe('Authentication (e2e)', () => {
  let authService: AuthService;
  let emailService: EmailService;

  beforeAll(async () => {
    const moduleRef = app.select(AuthService);
    authService = moduleRef.get<AuthService>(AuthService);
    emailService = moduleRef.get<EmailService>(EmailService);
  });

  describe('POST /v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('email', userData.email);

      // Verify user was created in database
      const user = await prismaService.user.findUnique({
        where: { email: userData.email },
      });
      expect(user).toBeDefined();
      expect(user?.isVerified).toBe(false);
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: 'Invalid email format',
        })
      );
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'password',
          message: 'Password must be at least 8 characters',
        })
      );
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('message', 'User already exists');
    });
  });

  describe('POST /v1/auth/login', () => {
    beforeEach(async () => {
      // Create a verified user for login tests
      const userData = {
        email: 'login@example.com',
        password: 'password123',
        name: 'Login User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(userData);

      // Manually verify the user
      await prismaService.user.update({
        where: { email: userData.email },
        data: { isVerified: true },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', loginData.email);
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should reject login for unverified user', async () => {
      // Create unverified user
      const userData = {
        email: 'unverified@example.com',
        password: 'password123',
        name: 'Unverified User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(userData);

      const loginData = {
        email: 'unverified@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Email not verified');
    });
  });

  describe('POST /v1/auth/verify-email', () => {
    let verificationToken: string;

    beforeEach(async () => {
      // Create user and get verification token
      const userData = {
        email: 'verify@example.com',
        password: 'password123',
        name: 'Verify User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(userData);

      // Get the verification token from the database
      const token = await prismaService.oneTimeToken.findFirst({
        where: {
          user: { email: userData.email },
          purpose: 'email_verification',
        },
      });

      verificationToken = token?.hash || '';
    });

    it('should verify email successfully with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Email verified successfully');

      // Verify user is now verified in database
      const user = await prismaService.user.findUnique({
        where: { email: 'verify@example.com' },
      });
      expect(user?.isVerified).toBe(true);
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });
  });

  describe('POST /v1/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create a verified user
      const userData = {
        email: 'forgot@example.com',
        password: 'password123',
        name: 'Forgot User',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(userData);

      await prismaService.user.update({
        where: { email: userData.email },
        data: { isVerified: true },
      });
    });

    it('should send password reset email successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password reset email sent');

      // Verify reset token was created
      const token = await prismaService.oneTimeToken.findFirst({
        where: {
          user: { email: 'forgot@example.com' },
          purpose: 'password_reset',
        },
      });
      expect(token).toBeDefined();
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'password123',
      };

      // Make multiple rapid login attempts
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/v1/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // Should get rate limited after a few attempts
      const rateLimited = responses.some(response => 
        response.status === 429 || response.body.message?.includes('Rate limit')
      );
      
      expect(rateLimited).toBe(true);
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate POST requests with idempotency key', async () => {
      const userData = {
        email: 'idempotent@example.com',
        password: 'password123',
        name: 'Idempotent User',
      };

      const idempotencyKey = 'test-key-123';

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .set('Idempotency-Key', idempotencyKey)
        .send(userData)
        .expect(201);

      // Second request with same idempotency key
      const response2 = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .set('Idempotency-Key', idempotencyKey)
        .send(userData)
        .expect(201);

      // Both responses should be identical
      expect(response1.body).toEqual(response2.body);

      // Only one user should be created
      const users = await prismaService.user.findMany({
        where: { email: userData.email },
      });
      expect(users).toHaveLength(1);
    });
  });
});

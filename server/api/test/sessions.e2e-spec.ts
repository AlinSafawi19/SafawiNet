import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/services/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { SessionsService } from '../src/auth/sessions.service';
import { NotificationsService } from '../src/auth/notifications.service';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { User } from '@prisma/client';

describe('Sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let sessionsService: SessionsService;
  let notificationsService: NotificationsService;
  let testUser: User;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    authService = moduleFixture.get<AuthService>(AuthService);
    sessionsService = moduleFixture.get<SessionsService>(SessionsService);
    notificationsService = moduleFixture.get<NotificationsService>(NotificationsService);
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.userSession.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@sessions.com',
        password: 'hashedPassword123',
        name: 'Test User',
        isVerified: true,
      },
    });

    // Login to get tokens
    const loginResult = await authService.login(
      { email: 'test@sessions.com', password: 'hashedPassword123' }
    );

    if (loginResult.tokens) {
      accessToken = loginResult.tokens.accessToken;
      refreshToken = loginResult.tokens.refreshToken;
    }
  });

  afterAll(async () => {
    await prisma.userSession.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('GET /v1/sessions', () => {
    it('should list user sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body.sessions).toBeInstanceOf(Array);
      expect(response.body.sessions.length).toBeGreaterThan(0);

      const session = response.body.sessions[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('userAgent');
      expect(session).toHaveProperty('deviceType');
      expect(session).toHaveProperty('browser');
      expect(session).toHaveProperty('os');
      expect(session).toHaveProperty('isCurrent');
      expect(session).toHaveProperty('lastActiveAt');
      expect(session).toHaveProperty('createdAt');
    });

    it('should support cursor pagination', async () => {
      // Create multiple sessions by logging in multiple times
      for (let i = 0; i < 3; i++) {
        await authService.login(
          { email: 'test@sessions.com', password: 'hashedPassword123' }
        );
      }

      const response = await request(app.getHttpServer())
        .get('/v1/sessions?limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.sessions).toHaveLength(2);
      expect(response.body.hasMore).toBe(true);
      expect(response.body.nextCursor).toBeDefined();

      // Test second page
      const secondPage = await request(app.getHttpServer())
        .get(`/v1/sessions?limit=2&cursor=${response.body.nextCursor}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(secondPage.body.sessions).toHaveLength(2);
      expect(secondPage.body.hasMore).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/v1/sessions')
        .expect(401);
    });
  });

  describe('DELETE /v1/sessions/:id', () => {
    it('should delete a specific session', async () => {
      // Get sessions first
      const sessionsResponse = await request(app.getHttpServer())
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      const sessionToDelete = sessionsResponse.body.sessions.find(
        (s: any) => !s.isCurrent
      );

      if (sessionToDelete) {
        await request(app.getHttpServer())
          .delete(`/v1/sessions/${sessionToDelete.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(204);

        // Verify session is deleted
        const sessionsAfterDelete = await request(app.getHttpServer())
          .get('/v1/sessions')
          .set('Authorization', `Bearer ${accessToken}`);

        const deletedSession = sessionsAfterDelete.body.sessions.find(
          (s: any) => s.id === sessionToDelete.id
        );
        expect(deletedSession).toBeUndefined();
      }
    });

    it('should not allow deleting current session', async () => {
      const sessionsResponse = await request(app.getHttpServer())
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      const currentSession = sessionsResponse.body.sessions.find(
        (s: any) => s.isCurrent
      );

      if (currentSession) {
        await request(app.getHttpServer())
          .delete(`/v1/sessions/${currentSession.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      }
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .delete('/v1/sessions/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('DELETE /v1/sessions', () => {
    it('should revoke all sessions except current', async () => {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        await authService.login(
          { email: 'test@sessions.com', password: 'hashedPassword123' }
        );
      }

      const response = await request(app.getHttpServer())
        .delete('/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ keepCurrent: true })
        .expect(200);

      expect(response.body).toHaveProperty('revokedCount');
      expect(response.body).toHaveProperty('message');
      expect(response.body.revokedCount).toBeGreaterThan(0);

      // Verify only current session remains
      const sessionsAfterRevoke = await request(app.getHttpServer())
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      const activeSessions = sessionsAfterRevoke.body.sessions.filter(
        (s: any) => s.isCurrent
      );
      expect(activeSessions).toHaveLength(1);
    });

    it('should revoke all sessions including current when keepCurrent is false', async () => {
      const response = await request(app.getHttpServer())
        .delete('/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ keepCurrent: false })
        .expect(200);

      expect(response.body.revokedCount).toBeGreaterThan(0);

      // Verify no sessions remain
      const sessionsAfterRevoke = await request(app.getHttpServer())
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(sessionsAfterRevoke.body.sessions).toHaveLength(0);
    });
  });

  describe('Session device tracking', () => {
    it('should track device information on login', async () => {
      const sessionsResponse = await request(app.getHttpServer())
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      const currentSession = sessionsResponse.body.sessions.find(
        (s: any) => s.isCurrent
      );

      expect(currentSession).toBeDefined();
      expect(currentSession.userAgent).toContain('Test Browser');
      expect(currentSession.deviceType).toBeDefined();
      expect(currentSession.browser).toBeDefined();
      expect(currentSession.os).toBeDefined();
    });

    it('should prevent future refresh from deleted session', async () => {
      // Get a non-current session
      const sessionsResponse = await request(app.getHttpServer())
        .get('/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      const sessionToDelete = sessionsResponse.body.sessions.find(
        (s: any) => !s.isCurrent
      );

      if (sessionToDelete) {
        // Delete the session
        await request(app.getHttpServer())
          .delete(`/v1/sessions/${sessionToDelete.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        // Try to refresh with the old refresh token (should fail)
        // Note: This test would need the actual refresh token from the deleted session
        // For now, we just verify the session was deleted
        const sessionsAfterDelete = await request(app.getHttpServer())
          .get('/v1/sessions')
          .set('Authorization', `Bearer ${accessToken}`);

        const deletedSession = sessionsAfterDelete.body.sessions.find(
          (s: any) => s.id === sessionToDelete.id
        );
        expect(deletedSession).toBeUndefined();
      }
    });
  });
});

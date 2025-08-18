import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/services/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { NotificationsService } from '../src/auth/notifications.service';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { User } from '@prisma/client';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let notificationsService: NotificationsService;
  let testUser: User;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    authService = moduleFixture.get<AuthService>(AuthService);
    notificationsService = moduleFixture.get<NotificationsService>(NotificationsService);
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.notification.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@notifications.com',
        password: 'hashedPassword123',
        name: 'Test User',
        isVerified: true,
      },
    });

    // Login to get tokens
    const loginResult = await authService.login(
      { email: 'test@notifications.com', password: 'hashedPassword123' }
    );

    if (loginResult.tokens) {
      accessToken = loginResult.tokens.accessToken;
    }

    // Create some test notifications
    await notificationsService.createSecurityAlert(
      testUser.id,
      'Security Alert 1',
      'This is a test security alert',
      { test: true }
    );

    await notificationsService.createAccountUpdate(
      testUser.id,
      'Account Update 1',
      'This is a test account update',
      { test: true }
    );

    await notificationsService.createSystemMessage(
      testUser.id,
      'System Message 1',
      'This is a test system message',
      { test: true }
    );
  });

  afterAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('GET /v1/notifications', () => {
    it('should list user notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body.notifications).toBeInstanceOf(Array);
      expect(response.body.notifications.length).toBeGreaterThan(0);

      const notification = response.body.notifications[0];
      expect(notification).toHaveProperty('id');
      expect(notification).toHaveProperty('type');
      expect(notification).toHaveProperty('title');
      expect(notification).toHaveProperty('message');
      expect(notification).toHaveProperty('isRead');
      expect(notification).toHaveProperty('priority');
      expect(notification).toHaveProperty('createdAt');
      expect(notification).toHaveProperty('updatedAt');
    });

    it('should support cursor pagination', async () => {
      // Create more notifications to test pagination
      for (let i = 2; i <= 5; i++) {
        await notificationsService.createSecurityAlert(
          testUser.id,
          `Security Alert ${i}`,
          `This is test security alert ${i}`,
          { test: true, index: i }
        );
      }

      const response = await request(app.getHttpServer())
        .get('/v1/notifications?limit=3')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.notifications).toHaveLength(3);
      expect(response.body.hasMore).toBe(true);
      expect(response.body.nextCursor).toBeDefined();

      // Test second page
      const secondPage = await request(app.getHttpServer())
        .get(`/v1/notifications?limit=3&cursor=${response.body.nextCursor}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(secondPage.body.notifications).toHaveLength(3);
      expect(secondPage.body.hasMore).toBe(true);

      // Test third page
      const thirdPage = await request(app.getHttpServer())
        .get(`/v1/notifications?limit=3&cursor=${secondPage.body.nextCursor}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(thirdPage.body.notifications).toHaveLength(2);
      expect(thirdPage.body.hasMore).toBe(false);
    });

    it('should filter by notification type', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/notifications?type=security_alert')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.notifications.length).toBeGreaterThan(0);
      response.body.notifications.forEach((notification: any) => {
        expect(notification.type).toBe('security_alert');
      });
    });

    it('should filter by read status', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/notifications?isRead=false')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.notifications.length).toBeGreaterThan(0);
      response.body.notifications.forEach((notification: any) => {
        expect(notification.isRead).toBe(false);
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/v1/notifications')
        .expect(401);
    });
  });

  describe('POST /v1/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      // Get unread notifications
      const notificationsResponse = await request(app.getHttpServer())
        .get('/v1/notifications?isRead=false')
        .set('Authorization', `Bearer ${accessToken}`);

      const unreadNotification = notificationsResponse.body.notifications[0];

      if (unreadNotification) {
        await request(app.getHttpServer())
          .post(`/v1/notifications/${unreadNotification.id}/read`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(204);

        // Verify notification is marked as read
        const updatedNotification = await prisma.notification.findUnique({
          where: { id: unreadNotification.id },
        });

        expect(updatedNotification?.isRead).toBe(true);
        expect(updatedNotification?.readAt).toBeDefined();
      }
    });

    it('should return 404 for non-existent notification', async () => {
      await request(app.getHttpServer())
        .post('/v1/notifications/non-existent-id/read')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/v1/notifications/test-id/read')
        .expect(401);
    });
  });

  describe('GET /v1/notifications/unread-count', () => {
    it('should return unread notification count', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should return 0 when all notifications are read', async () => {
      // Mark all notifications as read
      await notificationsService.markAllAsRead(testUser.id);

      const response = await request(app.getHttpServer())
        .get('/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.count).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/v1/notifications/unread-count')
        .expect(401);
    });
  });

  describe('Notification creation and management', () => {
    it('should create notifications with different types and priorities', async () => {
      // Create a high priority security alert
      const securityAlert = await notificationsService.createSecurityAlert(
        testUser.id,
        'High Priority Alert',
        'This is a high priority security alert',
        { priority: 'high', test: true }
      );

      expect(securityAlert.type).toBe('security_alert');
      expect(securityAlert.priority).toBe('high');

      // Create a normal priority account update
      const accountUpdate = await notificationsService.createAccountUpdate(
        testUser.id,
        'Normal Update',
        'This is a normal priority account update',
        { test: true }
      );

      expect(accountUpdate.type).toBe('account_update');
      expect(accountUpdate.priority).toBe('normal');

      // Create a low priority system message
      const systemMessage = await notificationsService.createSystemMessage(
        testUser.id,
        'Low Priority Message',
        'This is a low priority system message',
        { test: true }
      );

      expect(systemMessage.type).toBe('system_message');
      expect(systemMessage.priority).toBe('low');
    });

    it('should handle expired notifications correctly', async () => {
      // Create a notification with expiration
      const expiredNotification = await notificationsService.createNotification({
        userId: testUser.id,
        type: 'test',
        title: 'Expired Notification',
        message: 'This notification will expire',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      // The notification should not appear in the list due to expiration
      const response = await request(app.getHttpServer())
        .get('/v1/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const foundNotification = response.body.notifications.find(
        (n: any) => n.id === expiredNotification.id
      );
      expect(foundNotification).toBeUndefined();
    });
  });
});

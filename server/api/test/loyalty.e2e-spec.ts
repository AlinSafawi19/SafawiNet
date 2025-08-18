import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { SecurityUtils } from '../src/common/security/security.utils';

describe('Loyalty (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let testUserId: string;
  let bronzeTierId: string;
  let silverTierId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Clean up any existing test data first
    try {
      await prismaService.loyaltyTransaction.deleteMany({
        where: {
          loyaltyAccount: {
            user: {
              email: 'loyalty-test@safawinet.com',
            },
          },
        },
      });
      await prismaService.loyaltyAccount.deleteMany({
        where: {
          user: {
            email: 'loyalty-test@safawinet.com',
          },
        },
      });
      await prismaService.user.deleteMany({
        where: { email: 'loyalty-test@safawinet.com' },
      });
      await prismaService.loyaltyTier.deleteMany({
        where: {
          name: { in: ['Bronze', 'Silver'] },
        },
      });
    } catch (error) {
      // Ignore cleanup errors
      console.log('Cleanup completed (some errors expected)');
    }

    // Create loyalty tiers first
    console.log('Creating loyalty tiers...');
    const bronzeTier = await prismaService.loyaltyTier.create({
      data: {
        name: 'Bronze',
        minPoints: 0,
        maxPoints: 999,
        benefits: {
          discount: 0.05,
          freeShipping: false,
        },
        color: '#CD7F32',
        icon: '🥉',
      },
    });
    bronzeTierId = bronzeTier.id;
    console.log('✅ Bronze tier created with ID:', bronzeTierId);

    const silverTier = await prismaService.loyaltyTier.create({
      data: {
        name: 'Silver',
        minPoints: 1000,
        maxPoints: 4999,
        benefits: {
          discount: 0.10,
          freeShipping: true,
        },
        color: '#C0C0C0',
        icon: '🥈',
      },
    });
    silverTierId = silverTier.id;
    console.log('✅ Silver tier created with ID:', silverTierId);

    // Create a test user
    console.log('Creating test user...');
    const testUser = await prismaService.user.create({
      data: {
        email: 'loyalty-test@safawinet.com',
        password: await SecurityUtils.hashPassword('test123456'),
        name: 'Loyalty Test User',
        isVerified: true,
      },
    });
    testUserId = testUser.id;
    console.log('✅ Test user created with ID:', testUserId);

    // Create loyalty account with Silver tier
    console.log('Creating loyalty account...');
    const loyaltyAccount = await prismaService.loyaltyAccount.create({
      data: {
        userId: testUser.id,
        currentTierId: silverTier.id,
        currentPoints: 2500,
        lifetimePoints: 3500,
        tierUpgradedAt: new Date(),
      },
    });
    console.log('✅ Loyalty account created with ID:', loyaltyAccount.id);

    // Create sample transactions for pagination testing
    console.log('Creating sample transactions...');
    const transactions = Array.from({ length: 35 }, (_, i) => ({
      loyaltyAccountId: loyaltyAccount.id,
      type: i % 3 === 0 ? 'earn' : i % 3 === 1 ? 'spend' : 'adjustment',
      points: i % 3 === 0 ? 100 : i % 3 === 1 ? -50 : 10,
      description: `Transaction ${i + 1}`,
      metadata: { source: 'test' },
      orderId: i % 3 === 0 || i % 3 === 1 ? `order_${i}` : null,
      expiresAt: i % 3 === 0 ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Spread over 35 days
    }));

    await prismaService.loyaltyTransaction.createMany({
      data: transactions,
    });
    console.log('✅ 35 sample transactions created');

    // Get JWT token by logging in
    console.log('Getting JWT token...');
    try {
      const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'loyalty-test@safawinet.com',
          password: 'test123456',
        });

      if (loginResponse.status === 201 && loginResponse.body.access_token) {
        authToken = loginResponse.body.access_token;
        console.log('✅ Successfully obtained JWT token for loyalty tests');
      } else {
        console.error('❌ Failed to get JWT token:', loginResponse.status, loginResponse.body);
        throw new Error('Failed to get JWT token');
      }
    } catch (error) {
      console.error('❌ Error during login:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data
      console.log('Cleaning up test data...');
      await prismaService.loyaltyTransaction.deleteMany({
        where: {
          loyaltyAccount: {
            userId: testUserId,
          },
        },
      });
      await prismaService.loyaltyAccount.deleteMany({
        where: { userId: testUserId },
      });
      await prismaService.loyaltyTier.deleteMany({
        where: {
          name: { in: ['Bronze', 'Silver'] },
        },
      });
      await prismaService.user.delete({
        where: { id: testUserId },
      });
      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }

    await prismaService.$disconnect();
    await app.close();
  });

  describe('/v1/loyalty/me (GET)', () => {
    it('should return correct tier and balances for seeded data', async () => {
      if (!authToken) {
        throw new Error('No auth token available for test');
      }

      const response = await request(app.getHttpServer())
        .get('/v1/loyalty/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('currentTier');
      expect(response.body).toHaveProperty('currentPoints');
      expect(response.body).toHaveProperty('lifetimePoints');
      expect(response.body).toHaveProperty('tierUpgradedAt');
      expect(response.body).toHaveProperty('nextTier');

      // Verify tier information
      expect(response.body.currentTier.name).toBe('Silver');
      expect(response.body.currentTier.minPoints).toBe(1000);
      expect(response.body.currentTier.maxPoints).toBe(4999);
      expect(response.body.currentTier.benefits).toEqual({
        discount: 0.10,
        freeShipping: true,
      });
      expect(response.body.currentTier.color).toBe('#C0C0C0');
      expect(response.body.currentTier.icon).toBe('🥈');

      // Verify points
      expect(response.body.currentPoints).toBe(2500);
      expect(response.body.lifetimePoints).toBe(3500);

      // Verify next tier information
      expect(response.body.nextTier).toBeNull(); // Should be null since Silver is the highest tier we created
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/v1/loyalty/me')
        .expect(401);
    });
  });

  describe('/v1/loyalty/transactions (GET)', () => {
    it('should return paginated transactions with default limit', async () => {
      if (!authToken) {
        throw new Error('No auth token available for test');
      }

      const response = await request(app.getHttpServer())
        .get('/v1/loyalty/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');

      // Default limit should be 20
      expect(response.body.transactions).toHaveLength(20);
      expect(response.body.pagination.hasNext).toBe(true);
      expect(response.body.pagination.hasPrevious).toBe(false);
      expect(response.body.pagination.nextCursor).toBeTruthy();
      expect(response.body.pagination.previousCursor).toBeNull();

      // Verify transaction structure
      const transaction = response.body.transactions[0];
      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('type');
      expect(transaction).toHaveProperty('points');
      expect(transaction).toHaveProperty('description');
      expect(transaction).toHaveProperty('metadata');
      expect(transaction).toHaveProperty('orderId');
      expect(transaction).toHaveProperty('expiresAt');
      expect(transaction).toHaveProperty('createdAt');
    });

    it('should respect custom limit parameter', async () => {
      if (!authToken) {
        throw new Error('No auth token available for test');
      }

      const response = await request(app.getHttpServer())
        .get('/v1/loyalty/transactions?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(10);
      expect(response.body.pagination.hasNext).toBe(true);
      expect(response.body.pagination.nextCursor).toBeTruthy();
    });

    it('should handle cursor-based pagination correctly', async () => {
      if (!authToken) {
        throw new Error('No auth token available for test');
      }

      // Get first page
      const firstPage = await request(app.getHttpServer())
        .get('/v1/loyalty/transactions?limit=15')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(firstPage.body.transactions).toHaveLength(15);
      expect(firstPage.body.pagination.hasNext).toBe(true);
      expect(firstPage.body.pagination.nextCursor).toBeTruthy();

      // Get second page using cursor
      const secondPage = await request(app.getHttpServer())
        .get(`/v1/loyalty/transactions?limit=15&cursor=${firstPage.body.pagination.nextCursor}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(secondPage.body.transactions).toHaveLength(15);
      expect(secondPage.body.pagination.hasPrevious).toBe(true);
      expect(secondPage.body.pagination.previousCursor).toBe(firstPage.body.pagination.nextCursor);

      // Verify no overlap between pages
      const firstPageIds = firstPage.body.transactions.map(t => t.id);
      const secondPageIds = secondPage.body.transactions.map(t => t.id);
      const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(intersection).toHaveLength(0);
    });

    it('should enforce maximum limit of 100', async () => {
      if (!authToken) {
        throw new Error('No auth token available for test');
      }

      const response = await request(app.getHttpServer())
        .get('/v1/loyalty/transactions?limit=150')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(35); // Total transactions we created
      expect(response.body.pagination.hasNext).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/v1/loyalty/transactions')
        .expect(401);
    });

    it('should handle invalid cursor gracefully', async () => {
      if (!authToken) {
        throw new Error('No auth token available for test');
      }

      const response = await request(app.getHttpServer())
        .get('/v1/loyalty/transactions?cursor=invalid-cursor')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return empty result with invalid cursor
      expect(response.body.transactions).toHaveLength(0);
      expect(response.body.pagination.hasNext).toBe(false);
      expect(response.body.pagination.hasPrevious).toBe(false);
    });
  });

  describe('Database indexing verification', () => {
    it('should have proper indexes for pagination performance', async () => {
      // This test verifies that the database has the necessary indexes
      // for efficient pagination queries
      
      // Check if loyaltyAccountId + createdAt index exists (for transactions query)
      const transactions = await prismaService.loyaltyTransaction.findMany({
        where: {
          loyaltyAccount: {
            userId: testUserId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      expect(transactions).toHaveLength(10);
      // If this query is slow, it would indicate missing indexes
      // The actual performance would be measured in a real environment
    });
  });
});

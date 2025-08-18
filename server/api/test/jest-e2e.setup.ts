import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../src/common/services/prisma.service';
import { RedisService } from '../src/common/services/redis.service';

let app: INestApplication;
let prismaService: PrismaService;
let redisService: RedisService;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
    ],
    providers: [PrismaService, RedisService],
  }).compile();

  app = moduleFixture.createNestApplication();
  prismaService = moduleFixture.get<PrismaService>(PrismaService);
  redisService = moduleFixture.get<RedisService>(RedisService);

  await app.init();
});

beforeEach(async () => {
  // Clean database before each test
  await prismaService.$transaction([
    prismaService.user.deleteMany(),
    prismaService.oneTimeToken.deleteMany(),
    prismaService.refreshSession.deleteMany(),
    prismaService.twoFactorSecret.deleteMany(),
    prismaService.backupCode.deleteMany(),
    prismaService.recoveryStaging.deleteMany(),
    prismaService.pendingEmailChange.deleteMany(),
    prismaService.userSession.deleteMany(),
    prismaService.notification.deleteMany(),
    prismaService.loyaltyAccount.deleteMany(),
  ]);

  // Clean Redis
  await redisService.flushdb();
});

afterAll(async () => {
  await prismaService.$disconnect();
  await redisService.onModuleDestroy();
  await app.close();
});

export { app, prismaService, redisService };

import { PrismaClient, LoyaltyTier, LoyaltyTransaction, Prisma, Role } from '@prisma/client';
import { SecurityUtils } from '../src/common/security/security.utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.loyaltyTier.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.oneTimeToken.deleteMany();
  await prisma.user.deleteMany();

  // Create loyalty tiers
  console.log('🏆 Creating loyalty tiers...');
  const tiers = [
    {
      name: 'Bronze',
      minPoints: 0,
      maxPoints: 999,
      benefits: {
        discount: 0.05,
        freeShipping: false,
        prioritySupport: false,
        exclusiveOffers: false,
      },
      color: '#CD7F32',
      icon: '🥉',
    },
    {
      name: 'Silver',
      minPoints: 1000,
      maxPoints: 4999,
      benefits: {
        discount: 0.10,
        freeShipping: true,
        prioritySupport: false,
        exclusiveOffers: false,
      },
      color: '#C0C0C0',
      icon: '🥈',
    },
    {
      name: 'Gold',
      minPoints: 5000,
      maxPoints: 19999,
      benefits: {
        discount: 0.15,
        freeShipping: true,
        prioritySupport: true,
        exclusiveOffers: true,
      },
      color: '#FFD700',
      icon: '🥇',
    },
    {
      name: 'Platinum',
      minPoints: 20000,
      maxPoints: 99999,
      benefits: {
        discount: 0.20,
        freeShipping: true,
        prioritySupport: true,
        exclusiveOffers: true,
        vipEvents: true,
      },
      color: '#E5E4E2',
      icon: '💎',
    },
    {
      name: 'Diamond',
      minPoints: 100000,
      maxPoints: null,
      benefits: {
        discount: 0.25,
        freeShipping: true,
        prioritySupport: true,
        exclusiveOffers: true,
        vipEvents: true,
        personalConcierge: true,
      },
      color: '#B9F2FF',
      icon: '💎',
    },
  ];

  const createdTiers: LoyaltyTier[] = [];
  for (const tierData of tiers) {
    const tier = await prisma.loyaltyTier.create({
      data: tierData,
    });
    createdTiers.push(tier);
    console.log(`✅ Created tier: ${tier.name} (${tier.minPoints} points)`);
  }

  // Create test users with preferences
  const testUsers = [
    {
      email: 'admin@safawinet.com',
      password: 'admin123456',
      name: 'John Smith',
      roles: ['ADMIN', 'CUSTOMER'],
      loyaltyPoints: 2500, // Silver tier
      preferences: {
        theme: 'dark',
        language: 'en',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        notifications: {
          sound: true,
          desktop: true
        }
      },
      notificationPreferences: {
        email: {
          marketing: false,
          security: true,
          updates: true,
          weeklyDigest: true
        },
        push: {
          enabled: true,
          marketing: false,
          security: true,
          updates: true
        },
        sms: {
          enabled: false,
          security: true,
          twoFactor: true
        }
      }
    },
    {
      email: 'user@safawinet.com',
      password: 'user123456',
      name: 'Test User',
      roles: ['CUSTOMER'],
      loyaltyPoints: 7500, // Gold tier
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        notifications: {
          sound: false,
          desktop: true
        }
      },
      notificationPreferences: {
        email: {
          marketing: true,
          security: true,
          updates: false,
          weeklyDigest: false
        },
        push: {
          enabled: true,
          marketing: true,
          security: true,
          updates: false
        },
        sms: {
          enabled: true,
          security: true,
          twoFactor: true
        }
      }
    },
    {
      email: 'developer@safawinet.com',
      password: 'dev123456',
      name: 'Developer User',
      roles: ['MODERATOR', 'CUSTOMER'],
      loyaltyPoints: 150, // Bronze tier
      preferences: {
        theme: 'auto',
        language: 'en',
        timezone: 'Europe/London',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        notifications: {
          sound: true,
          desktop: false
        }
      },
      notificationPreferences: {
        email: {
          marketing: false,
          security: true,
          updates: true,
          weeklyDigest: false
        },
        push: {
          enabled: false,
          marketing: false,
          security: true,
          updates: true
        },
        sms: {
          enabled: false,
          security: true,
          twoFactor: false
        }
      }
    },
  ];

  for (const userData of testUsers) {
    const hashedPassword = await SecurityUtils.hashPassword(userData.password);
    
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        roles: userData.roles as Role[],
        preferences: userData.preferences,
        notificationPreferences: userData.notificationPreferences,
      },
    });

    console.log(`✅ Created user: ${user.email} (${user.name})`);

    // Create email verification token
    const verificationToken = SecurityUtils.generateSecureToken();
    const tokenHash = SecurityUtils.hashToken(verificationToken);

    await prisma.oneTimeToken.create({
      data: {
        purpose: 'email_verification',
        hash: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    console.log(`✅ Created verification token for: ${user.email}`);

    // Create loyalty account
    const userTier = createdTiers.find(tier => 
      userData.loyaltyPoints >= tier.minPoints && 
      (tier.maxPoints === null || userData.loyaltyPoints <= tier.maxPoints)
    );

    if (userTier) {
      const loyaltyAccount = await prisma.loyaltyAccount.create({
        data: {
          userId: user.id,
          currentTierId: userTier.id,
          currentPoints: userData.loyaltyPoints,
          lifetimePoints: userData.loyaltyPoints + Math.floor(Math.random() * 1000), // Random lifetime points
          tierUpgradedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Random date within last 30 days
        },
      });

      console.log(`✅ Created loyalty account for ${user.email}: ${userTier.name} tier (${userData.loyaltyPoints} points)`);

      // Create sample transactions for pagination testing
      const transactionTypes = ['earn', 'spend', 'adjustment'];
      const transactionDescriptions = [
        'Purchase bonus points',
        'Referral bonus',
        'Birthday bonus',
        'Order completion',
        'Review submission',
        'Social media engagement',
        'Points adjustment',
        'Expired points',
      ];

      // Create 25-50 transactions per user for pagination testing
      const numTransactions = 25 + Math.floor(Math.random() * 26);
      const transactions: Prisma.LoyaltyTransactionCreateManyInput[] = [];

      for (let i = 0; i < numTransactions; i++) {
        const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        const points = type === 'earn' 
          ? Math.floor(Math.random() * 100) + 10
          : type === 'spend' 
            ? -(Math.floor(Math.random() * 50) + 5)
            : Math.floor(Math.random() * 20) - 10; // Adjustment can be positive or negative

        const transaction = {
          loyaltyAccountId: loyaltyAccount.id,
          type,
          points,
          description: transactionDescriptions[Math.floor(Math.random() * transactionDescriptions.length)],
          metadata: {
            source: type === 'earn' ? 'purchase' : type === 'spend' ? 'redemption' : 'system',
            orderId: type === 'earn' || type === 'spend' ? `order_${Math.random().toString(36).substr(2, 9)}` : null,
          },
          orderId: type === 'earn' || type === 'spend' ? `order_${Math.random().toString(36).substr(2, 9)}` : null,
          expiresAt: type === 'earn' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null, // Earned points expire in 1 year
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000), // Random date within last year
        };

        transactions.push(transaction);
      }

      // Sort transactions by creation date for proper pagination testing
      transactions.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as string).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as string).getTime();
        return bTime - aTime;
      });

      await prisma.loyaltyTransaction.createMany({
        data: transactions,
      });

      console.log(`✅ Created ${numTransactions} transactions for ${user.email}`);
    }
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('   Admin: admin@safawinet.com / admin123456 (ADMIN + CUSTOMER roles, Silver tier - 2500 points)');
  console.log('   User: user@safawinet.com / user123456 (CUSTOMER role, Gold tier - 7500 points)');
  console.log('   Developer: developer@safawinet.com / dev123456 (MODERATOR + CUSTOMER roles, Bronze tier - 150 points)');
  console.log('\n🔑 Verification tokens have been created for all users');
  console.log('⚙️  Default preferences and notification settings have been set for all users');
  console.log('🏆 Loyalty accounts with sample transactions have been created for pagination testing');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
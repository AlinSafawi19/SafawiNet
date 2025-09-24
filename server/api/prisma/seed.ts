import { PrismaClient, LoyaltyTier, Role } from '@prisma/client';
import { SecurityUtils } from '../src/common/security/security.utils';

const prisma = new PrismaClient();

async function main() {

  // Check if loyalty tiers already exist
  const existingTiers = await prisma.loyaltyTier.count();
  let createdTiers: LoyaltyTier[] = [];
  
  if (existingTiers === 0) {

  // Create loyalty tiers
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
        discount: 0.1,
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
        discount: 0.2,
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
    }
  } else {
    createdTiers = await prisma.loyaltyTier.findMany();
  }

  // Create superadmin user
  
  // Check if superadmin already exists
  const existingSuperadmin = await prisma.user.findFirst({
    where: { roles: { has: Role.SUPERADMIN } }
  });
  
  if (!existingSuperadmin) {
    // Hash the superadmin password
    const superadminPassword = await SecurityUtils.hashPassword('superadmin123');
    
    // Default preferences for superadmin
    const defaultPreferences = {
      language: 'en',
      timezone: 'Asia/Beirut',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      notifications: {
        sound: true,
        desktop: true,
      },
    };

    // Default notification preferences for superadmin
    const defaultNotificationPreferences = {
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
    };

    // Create superadmin user
    const superadmin = await prisma.user.create({
      data: {
        email: 'superadmin@safawinet.com',
        password: superadminPassword,
        name: 'Super Admin',
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.CUSTOMER], // Superadmin has all roles
        isVerified: true, // Superadmin is pre-verified
        preferences: defaultPreferences,
        notificationPreferences: defaultNotificationPreferences,
      },
    });

    // Create loyalty account for superadmin (since they also have CUSTOMER role)
    const bronzeTier = createdTiers.find(tier => tier.name === 'Bronze');
    if (bronzeTier) {
      await prisma.loyaltyAccount.create({
        data: {
          userId: superadmin.id,
          currentTierId: bronzeTier.id,
          currentPoints: 0,
          lifetimePoints: 0,
          tierUpgradedAt: new Date(),
        },
      });
    }

  } else {
  }

}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

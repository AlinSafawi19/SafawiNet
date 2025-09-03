import { PrismaClient, LoyaltyTier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if loyalty tiers already exist
  const existingTiers = await prisma.loyaltyTier.count();
  if (existingTiers > 0) {
    console.log('✅ Loyalty tiers already exist, skipping seed...');
    return;
  }

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

  console.log('🎉 Database seeding completed successfully!');
  console.log(`🏆 Created ${createdTiers.length} loyalty tiers`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

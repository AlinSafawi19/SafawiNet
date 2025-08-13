import { PrismaClient } from '@prisma/client';
import { SecurityUtils } from '../src/common/security/security.utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.refreshSession.deleteMany();
  await prisma.oneTimeToken.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const testUsers = [
    {
      email: 'admin@safawinet.com',
      password: 'admin123456',
      name: 'Admin User',
    },
    {
      email: 'user@safawinet.com',
      password: 'user123456',
      name: 'Test User',
    },
    {
      email: 'developer@safawinet.com',
      password: 'dev123456',
      name: 'Developer User',
    },
  ];

  for (const userData of testUsers) {
    const hashedPassword = await SecurityUtils.hashPassword(userData.password);
    
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
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
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('   Admin: admin@safawinet.com / admin123456');
  console.log('   User: user@safawinet.com / user123456');
  console.log('   Developer: developer@safawinet.com / dev123456');
  console.log('\n🔑 Verification tokens have been created for all users');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

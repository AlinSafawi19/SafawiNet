import { PrismaClient } from '@prisma/client';
import { SecurityUtils } from '../src/common/security/security.utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.refreshSession.deleteMany();
  await prisma.oneTimeToken.deleteMany();
  await prisma.user.deleteMany();

  // Create test users with preferences
  const testUsers = [
    {
      email: 'admin@safawinet.com',
      password: 'admin123456',
      name: 'John Smith',
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
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('   Admin: admin@safawinet.com / admin123456');
  console.log('   User: user@safawinet.com / user123456');
  console.log('   Developer: developer@safawinet.com / dev123456');
  console.log('\n🔑 Verification tokens have been created for all users');
  console.log('⚙️  Default preferences and notification settings have been set for all users');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

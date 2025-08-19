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
  
  // Clean finance data
  await prisma.taxCategoryMapping.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.taxCategory.deleteMany();
  await prisma.cost.deleteMany();
  await prisma.price.deleteMany();
  await prisma.chartOfAccount.deleteMany();
  
  // Clean catalog data
  await prisma.productMedia.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  


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

  // Create Chart of Accounts
  console.log('📊 Creating Chart of Accounts...');
  const chartOfAccounts = [
    // Assets
    { code: '1000', name: 'Cash', type: 'asset', parentId: null },
    { code: '1100', name: 'Accounts Receivable', type: 'asset', parentId: null },
    { code: '1200', name: 'Inventory', type: 'asset', parentId: null },
    { code: '1300', name: 'Prepaid Expenses', type: 'asset', parentId: null },
    { code: '1400', name: 'Fixed Assets', type: 'asset', parentId: null },
    
    // Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'liability', parentId: null },
    { code: '2100', name: 'Accrued Expenses', type: 'liability', parentId: null },
    { code: '2200', name: 'Taxes Payable', type: 'liability', parentId: null },
    { code: '2300', name: 'Long-term Debt', type: 'liability', parentId: null },
    
    // Equity
    { code: '3000', name: 'Owner\'s Equity', type: 'equity', parentId: null },
    { code: '3100', name: 'Retained Earnings', type: 'equity', parentId: null },
    
    // Revenue
    { code: '4000', name: 'Sales Revenue', type: 'revenue', parentId: null },
    { code: '4100', name: 'Other Revenue', type: 'revenue', parentId: null },
    
    // Expenses
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense', parentId: null },
    { code: '5100', name: 'Operating Expenses', type: 'expense', parentId: null },
    { code: '5200', name: 'Marketing Expenses', type: 'expense', parentId: null },
    { code: '5300', name: 'Administrative Expenses', type: 'expense', parentId: null },
  ];

  const createdAccounts: any[] = [];
  for (const accountData of chartOfAccounts) {
    const account = await prisma.chartOfAccount.create({
      data: accountData,
    });
    createdAccounts.push(account);
    console.log(`✅ Created account: ${account.code} - ${account.name} (${account.type})`);
  }

  // Create Tax Categories
  console.log('💰 Creating Tax Categories...');
  const taxCategories = [
    { name: 'Standard Rate', description: 'Standard tax rate for most products' },
    { name: 'Reduced Rate', description: 'Reduced tax rate for certain products' },
    { name: 'Zero Rate', description: 'Zero tax rate for exempt products' },
    { name: 'Exempt', description: 'Tax exempt products' },
  ];

  const createdTaxCategories: any[] = [];
  for (const categoryData of taxCategories) {
    const category = await prisma.taxCategory.create({
      data: categoryData,
    });
    createdTaxCategories.push(category);
    console.log(`✅ Created tax category: ${category.name}`);
  }

  // Create Tax Rates
  console.log('📈 Creating Tax Rates...');
  const taxRates = [
    { taxCategoryId: createdTaxCategories[0].id, rate: 0.08, description: 'Standard 8% tax rate' },
    { taxCategoryId: createdTaxCategories[1].id, rate: 0.04, description: 'Reduced 4% tax rate' },
    { taxCategoryId: createdTaxCategories[2].id, rate: 0.00, description: 'Zero tax rate' },
    { taxCategoryId: createdTaxCategories[3].id, rate: 0.00, description: 'Tax exempt' },
  ];

  for (const rateData of taxRates) {
    const rate = await prisma.taxRate.create({
      data: rateData,
    });
    console.log(`✅ Created tax rate: ${(rate.rate * 100).toFixed(0)}% for ${createdTaxCategories.find(c => c.id === rate.taxCategoryId)?.name}`);
  }

  // Create Categories
  console.log('🏷️ Creating Categories...');
  const categories = [
    { name: 'Smartphones', slug: 'smartphones', description: 'Latest smartphones and mobile devices', sortOrder: 1 },
    { name: 'Laptops', slug: 'laptops', description: 'High-performance laptops and notebooks', sortOrder: 2 },
    { name: 'Tablets', slug: 'tablets', description: 'Tablets and portable computing devices', sortOrder: 3 },
    { name: 'Accessories', slug: 'accessories', description: 'Phone cases, chargers, and other accessories', sortOrder: 4 },
    { name: 'Smart Home', slug: 'smart-home', description: 'Smart home devices and IoT products', sortOrder: 5 },
  ];

  const createdCategories: any[] = [];
  for (const categoryData of categories) {
    const category = await prisma.category.create({
      data: categoryData,
    });
    createdCategories.push(category);
    console.log(`✅ Created category: ${category.name} (${category.slug})`);
  }

  // Create Products
  console.log('📱 Creating Products...');
  const products = [
    {
      name: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system',
      categoryId: createdCategories[0].id, // Smartphones
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'MacBook Pro 16-inch',
      slug: 'macbook-pro-16-inch',
      description: 'Powerful laptop with M3 Pro chip, perfect for professionals and creators',
      categoryId: createdCategories[1].id, // Laptops
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'iPad Pro 12.9-inch',
      slug: 'ipad-pro-12-9-inch',
      description: 'Premium tablet with M2 chip and Liquid Retina XDR display',
      categoryId: createdCategories[2].id, // Tablets
      isActive: true,
      sortOrder: 1,
    },
  ];

  const createdProducts: any[] = [];
  for (const productData of products) {
    const product = await prisma.product.create({
      data: productData,
    });
    createdProducts.push(product);
    console.log(`✅ Created product: ${product.name} (${product.slug})`);
  }

  // Create Product Variants
  console.log('📦 Creating Product Variants...');
  const variants = [
    {
      productId: createdProducts[0].id, // iPhone 15 Pro Max
      sku: 'IP15PM-256-BLK',
      name: '256GB Natural Titanium',
      description: '256GB storage in Natural Titanium finish',
      weight: 0.221,
      dimensions: { length: 15.9, width: 7.7, height: 0.8 },
      isActive: true,
      sortOrder: 1,
    },
    {
      productId: createdProducts[0].id, // iPhone 15 Pro Max
      sku: 'IP15PM-512-BLK',
      name: '512GB Natural Titanium',
      description: '512GB storage in Natural Titanium finish',
      weight: 0.221,
      dimensions: { length: 15.9, width: 7.7, height: 0.8 },
      isActive: true,
      sortOrder: 2,
    },
    {
      productId: createdProducts[1].id, // MacBook Pro 16-inch
      sku: 'MBP16-M3P-512',
      name: 'M3 Pro 512GB SSD',
      description: 'M3 Pro chip with 512GB SSD storage',
      weight: 2.15,
      dimensions: { length: 35.57, width: 24.81, height: 1.68 },
      isActive: true,
      sortOrder: 1,
    },
    {
      productId: createdProducts[2].id, // iPad Pro 12.9-inch
      sku: 'IPAD12-M2-256',
      name: 'M2 256GB WiFi',
      description: 'M2 chip with 256GB storage, WiFi only',
      weight: 0.682,
      dimensions: { length: 28.06, width: 21.49, height: 0.64 },
      isActive: true,
      sortOrder: 1,
    },
  ];

  const createdVariants: any[] = [];
  for (const variantData of variants) {
    const variant = await prisma.productVariant.create({
      data: variantData,
    });
    createdVariants.push(variant);
    console.log(`✅ Created variant: ${variant.name} (${variant.sku})`);
  }

  // Create Prices
  console.log('💰 Creating Prices...');
  const prices = [
    {
      variantId: createdVariants[0].id, // iPhone 15 Pro Max 256GB
      amount: 1199.00,
      currency: 'USD',
      version: 1,
      isActive: true,
      effectiveFrom: new Date(),
    },
    {
      variantId: createdVariants[1].id, // iPhone 15 Pro Max 512GB
      amount: 1399.00,
      currency: 'USD',
      version: 1,
      isActive: true,
      effectiveFrom: new Date(),
    },
    {
      variantId: createdVariants[2].id, // MacBook Pro 16-inch
      amount: 2499.00,
      currency: 'USD',
      version: 1,
      isActive: true,
      effectiveFrom: new Date(),
    },
    {
      variantId: createdVariants[3].id, // iPad Pro 12.9-inch
      amount: 1099.00,
      currency: 'USD',
      version: 1,
      isActive: true,
      effectiveFrom: new Date(),
    },
  ];

  for (const priceData of prices) {
    const price = await prisma.price.create({
      data: priceData,
    });
    console.log(`✅ Created price: $${price.amount} for variant ${createdVariants.find(v => v.id === price.variantId)?.sku}`);
  }

  // Create Costs
  console.log('📊 Creating Costs...');
  const costs = [
    {
      variantId: createdVariants[0].id, // iPhone 15 Pro Max 256GB
      amount: 899.00,
      currency: 'USD',
      isActive: true,
      effectiveFrom: new Date(),
    },
    {
      variantId: createdVariants[1].id, // iPhone 15 Pro Max 512GB
      amount: 1049.00,
      currency: 'USD',
      isActive: true,
      effectiveFrom: new Date(),
    },
    {
      variantId: createdVariants[2].id, // MacBook Pro 16-inch
      amount: 1899.00,
      currency: 'USD',
      isActive: true,
      effectiveFrom: new Date(),
    },
    {
      variantId: createdVariants[3].id, // iPad Pro 12.9-inch
      amount: 799.00,
      currency: 'USD',
      isActive: true,
      effectiveFrom: new Date(),
    },
  ];

  for (const costData of costs) {
    const cost = await prisma.cost.create({
      data: costData,
    });
    console.log(`✅ Created cost: $${cost.amount} for variant ${createdVariants.find(v => v.id === cost.variantId)?.sku}`);
  }

  // Create Tax Category Mappings
  console.log('🏷️ Creating Tax Category Mappings...');
  const taxMappings = [
    {
      variantId: createdVariants[0].id, // iPhone 15 Pro Max 256GB
      taxCategoryId: createdTaxCategories[0].id, // Standard Rate
      glAccountId: createdAccounts[2].id, // Inventory account
    },
    {
      variantId: createdVariants[1].id, // iPhone 15 Pro Max 512GB
      taxCategoryId: createdTaxCategories[0].id, // Standard Rate
      glAccountId: createdAccounts[2].id, // Inventory account
    },
    {
      variantId: createdVariants[2].id, // MacBook Pro 16-inch
      taxCategoryId: createdTaxCategories[0].id, // Standard Rate
      glAccountId: createdAccounts[2].id, // Inventory account
    },
    {
      variantId: createdVariants[3].id, // iPad Pro 12.9-inch
      taxCategoryId: createdTaxCategories[0].id, // Standard Rate
      glAccountId: createdAccounts[2].id, // Inventory account
    },
  ];

  for (const mappingData of taxMappings) {
    const mapping = await prisma.taxCategoryMapping.create({
      data: mappingData,
    });
    console.log(`✅ Created tax mapping for variant ${createdVariants.find(v => v.id === mapping.variantId)?.sku}`);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('   Admin: admin@safawinet.com / admin123456 (ADMIN + CUSTOMER roles, Silver tier - 2500 points)');
  console.log('   User: user@safawinet.com / user123456 (CUSTOMER role, Gold tier - 7500 points)');
  console.log('   Developer: developer@safawinet.com / dev123456 (MODERATOR + CUSTOMER roles, Bronze tier - 150 points)');
  console.log('\n🔑 Verification tokens have been created for all users');
  console.log('⚙️  Default preferences and notification settings have been set for all users');
  console.log('🏆 Loyalty accounts with sample transactions have been created for pagination testing');
  console.log('📊 Chart of Accounts has been created with standard GL accounts');
  console.log('💰 Tax categories and rates have been set up');
  console.log('🏷️ Categories have been created (Smartphones, Laptops, Tablets, Accessories, Smart Home)');
  console.log('📱 Sample products have been created (iPhone 15 Pro Max, MacBook Pro 16-inch, iPad Pro 12.9-inch)');
  console.log('📦 Product variants with prices, costs, and tax mappings have been set up');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

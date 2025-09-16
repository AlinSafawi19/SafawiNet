# 🗄️ Database Deployment Guide

This guide covers the best approaches for deploying your PostgreSQL database in production with optimal performance, security, and reliability.

## Database Architecture Overview

Your application uses:
- **PostgreSQL 15** as the primary database
- **Prisma ORM** for database operations
- **Redis** for caching and sessions
- **Database migrations** for schema management
- **Seeding** for initial data

## 🎯 **Recommended Database Hosting Options**

### 1. **AWS RDS (Best for Production)**
- ✅ Fully managed PostgreSQL
- ✅ Automated backups and point-in-time recovery
- ✅ Multi-AZ deployment for high availability
- ✅ Read replicas for scaling
- ✅ Security and compliance features
- ✅ Monitoring and alerting

### 2. **Google Cloud SQL (Great Alternative)**
- ✅ Fully managed PostgreSQL
- ✅ Automatic failover
- ✅ Integrated monitoring
- ✅ Easy scaling
- ✅ Competitive pricing

### 3. **DigitalOcean Managed Databases (Cost-Effective)**
- ✅ Simple setup
- ✅ Good performance
- ✅ Automated backups
- ✅ Great for startups

### 4. **Supabase (Developer-Friendly)**
- ✅ PostgreSQL with additional features
- ✅ Real-time subscriptions
- ✅ Built-in authentication
- ✅ Great developer experience

## 🚀 **Option 1: AWS RDS (Recommended)**

### Step 1: Create RDS PostgreSQL Instance

#### 1.1 Using AWS CLI
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name safawinet-subnet-group \
  --db-subnet-group-description "Subnet group for Safawinet database" \
  --subnet-ids subnet-xxxxxxxxx subnet-yyyyyyyyy

# Create security group
aws ec2 create-security-group \
  --group-name safawinet-db-sg \
  --description "Security group for Safawinet database"

# Add inbound rule for PostgreSQL
aws ec2 authorize-security-group-ingress \
  --group-name safawinet-db-sg \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier safawinet-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password "YourSecurePassword123!" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name safawinet-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted \
  --deletion-protection \
  --enable-performance-insights \
  --performance-insights-retention-period 7
```

#### 1.2 Using AWS Console
1. Go to RDS in AWS Console
2. Click "Create database"
3. Choose "PostgreSQL"
4. Select "Production" template
5. Configure:
   - **DB instance identifier**: `safawinet-prod`
   - **Master username**: `postgres`
   - **Master password**: Generate secure password
   - **DB instance class**: `db.t3.micro` (start small)
   - **Storage**: 20 GB GP2
   - **Multi-AZ deployment**: Yes
   - **Storage encryption**: Yes
   - **Backup retention**: 7 days
   - **Deletion protection**: Yes

### Step 2: Configure Database Security

#### 2.1 Create Database User
```sql
-- Connect to your RDS instance
psql -h your-rds-endpoint.region.rds.amazonaws.com -U postgres -d postgres

-- Create application user
CREATE USER safawinet_app WITH PASSWORD 'SecureAppPassword123!';

-- Create database
CREATE DATABASE safawinet_prod OWNER safawinet_app;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE safawinet_prod TO safawinet_app;
GRANT ALL PRIVILEGES ON SCHEMA public TO safawinet_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO safawinet_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO safawinet_app;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO safawinet_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO safawinet_app;
```

#### 2.2 Update Security Groups
```bash
# Update security group to only allow access from your application
aws ec2 authorize-security-group-ingress \
  --group-name safawinet-db-sg \
  --protocol tcp \
  --port 5432 \
  --source-group sg-your-app-security-group
```

### Step 3: Configure Prisma for Production

#### 3.1 Update Environment Variables
```bash
# Production DATABASE_URL
DATABASE_URL="postgresql://safawinet_app:SecureAppPassword123!@your-rds-endpoint.region.rds.amazonaws.com:5432/safawinet_prod?sslmode=require"
```

#### 3.2 Update Prisma Schema
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // For migrations
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["tracing"]
}
```

#### 3.3 Run Migrations
```bash
cd server/api

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed
```

## 🚀 **Option 2: Google Cloud SQL**

### Step 1: Create Cloud SQL Instance
```bash
# Create Cloud SQL instance
gcloud sql instances create safawinet-prod \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=20GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04 \
  --authorized-networks=0.0.0.0/0 \
  --root-password=YourSecurePassword123!
```

### Step 2: Create Database and User
```bash
# Create database
gcloud sql databases create safawinet_prod --instance=safawinet-prod

# Create user
gcloud sql users create safawinet_app \
  --instance=safawinet-prod \
  --password=SecureAppPassword123!
```

## 🚀 **Option 3: DigitalOcean Managed Database**

### Step 1: Create Database Cluster
1. Go to DigitalOcean Control Panel
2. Navigate to Databases
3. Click "Create Database Cluster"
4. Select PostgreSQL 15
5. Choose plan (Basic $15/month for 1GB RAM)
6. Select region
7. Create cluster

### Step 2: Configure Database
1. Go to your database cluster
2. Click "Users & Databases" tab
3. Create new database: `safawinet_prod`
4. Create new user: `safawinet_app`
5. Note the connection details

## 🚀 **Option 4: Supabase (Developer-Friendly)**

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create new project
4. Choose region
5. Set database password

### Step 2: Get Connection String
1. Go to Settings → Database
2. Copy the connection string
3. Update your `DATABASE_URL`

## 🔧 **Database Configuration**

### 1. Connection Pooling
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["tracing"]
}
```

### 2. Environment Variables
```bash
# Production database URL
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require&connection_limit=20&pool_timeout=20"

# Direct URL for migrations
DIRECT_URL="postgresql://username:password@host:port/database?sslmode=require"
```

### 3. Prisma Client Configuration
```typescript
// src/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## 📊 **Database Monitoring**

### 1. AWS RDS Monitoring
- **CloudWatch metrics**: CPU, memory, connections
- **Performance Insights**: Query performance
- **Enhanced monitoring**: Detailed metrics

### 2. Custom Monitoring
```typescript
// Add to your health check
@Get('health')
async healthCheck() {
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    return { status: 'error', database: 'disconnected' };
  }
}
```

## 🔒 **Security Best Practices**

### 1. Network Security
- Use VPC and private subnets
- Restrict access to application servers only
- Enable SSL/TLS encryption

### 2. Authentication
- Use strong passwords
- Rotate passwords regularly
- Use IAM database authentication (AWS)

### 3. Data Protection
- Enable encryption at rest
- Enable encryption in transit
- Regular backups
- Point-in-time recovery

## 📈 **Performance Optimization**

### 1. Database Tuning
```sql
-- Optimize PostgreSQL settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

### 2. Indexing Strategy
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_loyalty_accounts_user_id ON loyalty_accounts(user_id);
```

### 3. Connection Pooling
```typescript
// Use connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=20&pool_timeout=20'
    }
  }
});
```

## 🔄 **Backup and Recovery**

### 1. Automated Backups
- **AWS RDS**: Automatic daily backups
- **Google Cloud SQL**: Automatic backups
- **DigitalOcean**: Daily backups included

### 2. Manual Backups
```bash
# Create manual backup
pg_dump -h your-host -U username -d database_name > backup.sql

# Restore from backup
psql -h your-host -U username -d database_name < backup.sql
```

### 3. Point-in-Time Recovery
- **AWS RDS**: Up to 35 days
- **Google Cloud SQL**: Up to 7 days
- **DigitalOcean**: Up to 7 days

## 🚀 **Scaling Strategies**

### 1. Read Replicas
```bash
# Create read replica (AWS RDS)
aws rds create-db-instance-read-replica \
  --db-instance-identifier safawinet-prod-read-replica \
  --source-db-instance-identifier safawinet-prod \
  --db-instance-class db.t3.micro
```

### 2. Connection Pooling
- Use PgBouncer for connection pooling
- Implement read/write splitting
- Use connection limits

### 3. Caching
- Redis for session storage
- Application-level caching
- Query result caching

## 📋 **Production Checklist**

- [ ] Database instance created
- [ ] Security groups configured
- [ ] Database user created
- [ ] SSL/TLS enabled
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Migrations run
- [ ] Database seeded
- [ ] Connection pooling configured
- [ ] Performance monitoring set up
- [ ] Backup and recovery tested

## 🆘 **Troubleshooting**

### Common Issues
1. **Connection timeout**: Check security groups and network
2. **Authentication failed**: Verify credentials
3. **Migration failures**: Check database permissions
4. **Performance issues**: Review indexes and queries

### Debug Commands
```bash
# Test database connection
psql -h your-host -U username -d database_name -c "SELECT 1;"

# Check database size
psql -h your-host -U username -d database_name -c "SELECT pg_size_pretty(pg_database_size('database_name'));"

# Check active connections
psql -h your-host -U username -d database_name -c "SELECT count(*) FROM pg_stat_activity;"
```

## 💰 **Cost Optimization**

### 1. Right-sizing
- Start with smaller instances
- Monitor usage and scale up
- Use reserved instances for predictable workloads

### 2. Storage Optimization
- Use appropriate storage types
- Enable storage auto-scaling
- Regular cleanup of old data

### 3. Backup Optimization
- Adjust backup retention periods
- Use snapshots for long-term storage
- Compress backups

---

**Result**: Your database will be highly available, secure, and optimized for production workloads!

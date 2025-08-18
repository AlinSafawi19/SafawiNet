#!/usr/bin/env ts-node

/**
 * Deployment Script with Migration Rollback
 * 
 * This script handles deployments with database migrations and provides
 * rollback capabilities in case of failures.
 * 
 * Features:
 * - Database migration with rollback on failure
 * - Keeps previous task set running on deployment failure
 * - Health checks before and after deployment
 * - Comprehensive logging and audit trail
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface DeploymentConfig {
  environment: 'dev' | 'staging' | 'prod';
  skipMigrations?: boolean;
  forceRollback?: boolean;
  healthCheckTimeout?: number;
  maxRetries?: number;
}

interface DeploymentState {
  deploymentId: string;
  startTime: Date;
  environment: string;
  previousTaskSet?: string;
  currentTaskSet?: string;
  migrationStatus: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  deploymentStatus: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  logs: string[];
}

class DeploymentManager {
  private prisma: PrismaClient;
  private config: DeploymentConfig;
  private state: DeploymentState;
  private readonly logDir: string;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.prisma = new PrismaClient();
    this.logDir = path.join(process.cwd(), 'logs', 'deployments');
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.state = {
      deploymentId: `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      environment: config.environment,
      migrationStatus: 'pending',
      deploymentStatus: 'pending',
      logs: [],
    };
  }

  async deploy(): Promise<void> {
    console.log('🚀 Starting deployment with rollback protection');
    console.log('================================================\n');

    try {
      await this.log('Starting deployment', { deploymentId: this.state.deploymentId });
      
      // Step 1: Pre-deployment health check
      await this.preDeploymentHealthCheck();
      
      // Step 2: Backup current state
      await this.backupCurrentState();
      
      // Step 3: Run database migrations
      if (!this.config.skipMigrations) {
        await this.runMigrations();
      }
      
      // Step 4: Deploy application
      await this.deployApplication();
      
      // Step 5: Post-deployment health check
      await this.postDeploymentHealthCheck();
      
      // Step 6: Cleanup old resources
      await this.cleanupOldResources();
      
      await this.log('Deployment completed successfully');
      console.log('✅ Deployment completed successfully!');
      
    } catch (error) {
      await this.log('Deployment failed', { error: error.message });
      console.error('❌ Deployment failed:', error.message);
      
      // Attempt rollback
      await this.rollback();
      
      throw error;
    } finally {
      await this.saveDeploymentLog();
      await this.prisma.$disconnect();
    }
  }

  private async preDeploymentHealthCheck(): Promise<void> {
    await this.log('Running pre-deployment health check');
    console.log('🔍 Running pre-deployment health check...');

    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check application health endpoint
      const healthCheckUrl = this.getHealthCheckUrl();
      const { stdout } = await execAsync(`curl -f -s ${healthCheckUrl}`);
      
      if (!stdout.includes('healthy')) {
        throw new Error('Application health check failed');
      }
      
      await this.log('Pre-deployment health check passed');
      console.log('✅ Pre-deployment health check passed');
      
    } catch (error) {
      await this.log('Pre-deployment health check failed', { error: error.message });
      throw new Error(`Pre-deployment health check failed: ${error.message}`);
    }
  }

  private async backupCurrentState(): Promise<void> {
    await this.log('Backing up current state');
    console.log('💾 Backing up current state...');

    try {
      // Get current task set (if using ECS)
      if (this.config.environment === 'prod' || this.config.environment === 'staging') {
        const { stdout } = await execAsync('aws ecs describe-services --cluster safawinet-cluster --services safawinet-api --query "services[0].taskDefinition" --output text');
        this.state.previousTaskSet = stdout.trim();
        await this.log('Backed up previous task set', { taskSet: this.state.previousTaskSet });
      }

      // Create database backup
      await this.createDatabaseBackup();
      
      await this.log('Current state backup completed');
      console.log('✅ Current state backup completed');
      
    } catch (error) {
      await this.log('Backup failed', { error: error.message });
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  private async createDatabaseBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.logDir, `db-backup-${timestamp}.sql`);
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not set');
    }

    // Extract database connection details
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    const pgDumpCmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f ${backupFile}`;
    
    await execAsync(pgDumpCmd);
    await this.log('Database backup created', { backupFile });
  }

  private async runMigrations(): Promise<void> {
    await this.log('Starting database migrations');
    console.log('🔄 Running database migrations...');
    
    this.state.migrationStatus = 'running';

    try {
      // Run Prisma migrations
      const { stdout, stderr } = await execAsync('npm run db:migrate:deploy', {
        cwd: path.join(process.cwd(), 'server/api'),
        env: { ...process.env, NODE_ENV: this.config.environment },
      });

      if (stderr && !stderr.includes('warning')) {
        throw new Error(`Migration failed: ${stderr}`);
      }

      await this.log('Migrations completed successfully', { output: stdout });
      this.state.migrationStatus = 'completed';
      console.log('✅ Database migrations completed');
      
    } catch (error) {
      this.state.migrationStatus = 'failed';
      await this.log('Migration failed', { error: error.message });
      throw new Error(`Database migration failed: ${error.message}`);
    }
  }

  private async deployApplication(): Promise<void> {
    await this.log('Starting application deployment');
    console.log('🚀 Deploying application...');
    
    this.state.deploymentStatus = 'running';

    try {
      let deployCommand: string;
      
      switch (this.config.environment) {
        case 'dev':
          deployCommand = 'docker-compose up -d --build';
          break;
        case 'staging':
          deployCommand = 'aws ecs update-service --cluster safawinet-cluster --service safawinet-api-staging --force-new-deployment';
          break;
        case 'prod':
          deployCommand = 'aws ecs update-service --cluster safawinet-cluster --service safawinet-api --force-new-deployment';
          break;
        default:
          throw new Error(`Unknown environment: ${this.config.environment}`);
      }

      const { stdout } = await execAsync(deployCommand);
      
      // Wait for deployment to stabilize
      await this.waitForDeploymentStability();
      
      await this.log('Application deployment completed', { output: stdout });
      this.state.deploymentStatus = 'completed';
      console.log('✅ Application deployment completed');
      
    } catch (error) {
      this.state.deploymentStatus = 'failed';
      await this.log('Application deployment failed', { error: error.message });
      throw new Error(`Application deployment failed: ${error.message}`);
    }
  }

  private async waitForDeploymentStability(): Promise<void> {
    await this.log('Waiting for deployment to stabilize');
    console.log('⏳ Waiting for deployment to stabilize...');

    const maxAttempts = this.config.maxRetries || 30;
    const healthCheckUrl = this.getHealthCheckUrl();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { stdout } = await execAsync(`curl -f -s ${healthCheckUrl}`);
        
        if (stdout.includes('healthy')) {
          await this.log('Deployment stabilized');
          console.log('✅ Deployment stabilized');
          return;
        }
      } catch (error) {
        // Health check failed, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      console.log(`⏳ Health check attempt ${attempt}/${maxAttempts}...`);
    }

    throw new Error('Deployment failed to stabilize within timeout period');
  }

  private async postDeploymentHealthCheck(): Promise<void> {
    await this.log('Running post-deployment health check');
    console.log('🔍 Running post-deployment health check...');

    try {
      const healthCheckUrl = this.getHealthCheckUrl();
      const { stdout } = await execAsync(`curl -f -s ${healthCheckUrl}`);
      
      if (!stdout.includes('healthy')) {
        throw new Error('Post-deployment health check failed');
      }
      
      await this.log('Post-deployment health check passed');
      console.log('✅ Post-deployment health check passed');
      
    } catch (error) {
      await this.log('Post-deployment health check failed', { error: error.message });
      throw new Error(`Post-deployment health check failed: ${error.message}`);
    }
  }

  private async cleanupOldResources(): Promise<void> {
    await this.log('Cleaning up old resources');
    console.log('🧹 Cleaning up old resources...');

    try {
      // Clean up old Docker images (dev environment)
      if (this.config.environment === 'dev') {
        await execAsync('docker image prune -f');
      }

      // Clean up old task definitions (staging/prod)
      if (this.config.environment === 'staging' || this.config.environment === 'prod') {
        await this.cleanupOldTaskDefinitions();
      }

      await this.log('Resource cleanup completed');
      console.log('✅ Resource cleanup completed');
      
    } catch (error) {
      await this.log('Resource cleanup failed', { error: error.message });
      // Don't fail deployment for cleanup errors
      console.warn('⚠️ Resource cleanup failed (non-critical):', error.message);
    }
  }

  private async cleanupOldTaskDefinitions(): Promise<void> {
    try {
      const { stdout } = await execAsync('aws ecs list-task-definitions --family-prefix safawinet-api --status ACTIVE --sort DESC --query "taskDefinitionArns[5:]" --output text');
      
      if (stdout.trim()) {
        const oldTaskDefs = stdout.trim().split('\t');
        for (const taskDef of oldTaskDefs) {
          await execAsync(`aws ecs deregister-task-definition --task-definition ${taskDef}`);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async rollback(): Promise<void> {
    await this.log('Starting rollback procedure');
    console.log('🔄 Starting rollback procedure...');

    try {
      // Rollback database migrations if they were applied
      if (this.state.migrationStatus === 'completed') {
        await this.rollbackMigrations();
      }

      // Rollback application deployment
      if (this.state.deploymentStatus === 'completed') {
        await this.rollbackApplication();
      }

      await this.log('Rollback completed successfully');
      console.log('✅ Rollback completed successfully');
      
    } catch (error) {
      await this.log('Rollback failed', { error: error.message });
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  private async rollbackMigrations(): Promise<void> {
    await this.log('Rolling back database migrations');
    console.log('🔄 Rolling back database migrations...');

    try {
      // Restore from backup
      const backupFiles = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('db-backup-'))
        .sort()
        .reverse();

      if (backupFiles.length > 0) {
        const latestBackup = path.join(this.logDir, backupFiles[0]);
        await this.restoreDatabaseBackup(latestBackup);
      }

      this.state.migrationStatus = 'rolled_back';
      await this.log('Database migrations rolled back');
      console.log('✅ Database migrations rolled back');
      
    } catch (error) {
      await this.log('Migration rollback failed', { error: error.message });
      throw new Error(`Migration rollback failed: ${error.message}`);
    }
  }

  private async restoreDatabaseBackup(backupFile: string): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not set');
    }

    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    const psqlCmd = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${backupFile}`;
    
    await execAsync(psqlCmd);
  }

  private async rollbackApplication(): Promise<void> {
    await this.log('Rolling back application deployment');
    console.log('🔄 Rolling back application deployment...');

    try {
      // If we have a previous task set, rollback to it
      if (this.state.previousTaskSet) {
        let rollbackCommand: string;
        
        switch (this.config.environment) {
          case 'staging':
            rollbackCommand = `aws ecs update-service --cluster safawinet-cluster --service safawinet-api-staging --task-definition ${this.state.previousTaskSet}`;
            break;
          case 'prod':
            rollbackCommand = `aws ecs update-service --cluster safawinet-cluster --service safawinet-api --task-definition ${this.state.previousTaskSet}`;
            break;
          default:
            throw new Error(`Rollback not supported for environment: ${this.config.environment}`);
        }

        await execAsync(rollbackCommand);
        
        // Wait for rollback to complete
        await this.waitForDeploymentStability();
      }

      this.state.deploymentStatus = 'rolled_back';
      await this.log('Application deployment rolled back');
      console.log('✅ Application deployment rolled back');
      
    } catch (error) {
      await this.log('Application rollback failed', { error: error.message });
      throw new Error(`Application rollback failed: ${error.message}`);
    }
  }

  private getHealthCheckUrl(): string {
    switch (this.config.environment) {
      case 'dev':
        return 'http://localhost:3000/health';
      case 'staging':
        return 'https://api-stg.safawinet.com/health';
      case 'prod':
        return 'https://api.safawinet.com/health';
      default:
        throw new Error(`Unknown environment: ${this.config.environment}`);
    }
  }

  private async log(message: string, data?: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data,
    };
    
    this.state.logs.push(JSON.stringify(logEntry));
    console.log(`[${logEntry.timestamp}] ${message}`);
  }

  private async saveDeploymentLog(): Promise<void> {
    const logFile = path.join(this.logDir, `deployment-${this.state.deploymentId}.json`);
    fs.writeFileSync(logFile, JSON.stringify(this.state, null, 2));
    console.log(`📝 Deployment log saved to: ${logFile}`);
  }
}

// Parse command line arguments
function parseArgs(): DeploymentConfig {
  const args = process.argv.slice(2);
  const config: DeploymentConfig = {
    environment: 'dev',
    healthCheckTimeout: 300000, // 5 minutes
    maxRetries: 30,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--env':
      case '--environment':
        const env = args[++i];
        if (['dev', 'staging', 'prod'].includes(env)) {
          config.environment = env as 'dev' | 'staging' | 'prod';
        } else {
          throw new Error(`Invalid environment: ${env}`);
        }
        break;
      case '--skip-migrations':
        config.skipMigrations = true;
        break;
      case '--force-rollback':
        config.forceRollback = true;
        break;
      case '--health-check-timeout':
        config.healthCheckTimeout = parseInt(args[++i]) * 1000;
        break;
      case '--max-retries':
        config.maxRetries = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
Deployment Script with Migration Rollback

Usage:
  ts-node scripts/deploy-with-rollback.ts --env prod
  ts-node scripts/deploy-with-rollback.ts --env staging --skip-migrations
  ts-node scripts/deploy-with-rollback.ts --env dev --force-rollback

Options:
  --env, --environment <env>     Environment to deploy to (dev|staging|prod)
  --skip-migrations              Skip database migrations
  --force-rollback               Force rollback of current deployment
  --health-check-timeout <sec>   Health check timeout in seconds (default: 300)
  --max-retries <count>          Maximum health check retries (default: 30)
  --help                         Show this help message

Examples:
  # Deploy to production
  ts-node scripts/deploy-with-rollback.ts --env prod

  # Deploy to staging without migrations
  ts-node scripts/deploy-with-rollback.ts --env staging --skip-migrations

  # Deploy to dev with custom timeout
  ts-node scripts/deploy-with-rollback.ts --env dev --health-check-timeout 600
        `);
        process.exit(0);
    }
  }

  return config;
}

// Main execution
async function main() {
  try {
    const config = parseArgs();
    const deploymentManager = new DeploymentManager(config);
    await deploymentManager.deploy();
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

#!/usr/bin/env ts-node

/**
 * Mass Session Revocation Script
 * 
 * This script allows administrators to revoke all sessions for multiple users
 * in case of security incidents or token compromises.
 * 
 * Usage:
 *   ts-node scripts/mass-revoke-sessions.ts --users user1,user2,user3 --reason "Security incident"
 *   ts-node scripts/mass-revoke-sessions.ts --file user-ids.txt --reason "Token compromise"
 */

import { PrismaClient } from '@prisma/client';
import { SessionsService } from '../server/api/src/auth/sessions.service';
import { NotificationsService } from '../server/api/src/auth/notifications.service';
import { RedisService } from '../server/api/src/common/services/redis.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

interface RevokeOptions {
  users?: string[];
  file?: string;
  reason?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

class MassRevokeScript {
  private prisma: PrismaClient;
  private sessionsService: SessionsService;
  private notificationsService: NotificationsService;

  constructor() {
    this.prisma = new PrismaClient();
    
    // Initialize services with minimal dependencies
    const configService = new ConfigService();
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'fallback-secret',
    });
    const redisService = new RedisService(configService);
    
    this.sessionsService = new SessionsService(this.prisma, jwtService);
    this.notificationsService = new NotificationsService(this.prisma, redisService);
  }

  async run(options: RevokeOptions): Promise<void> {
    console.log('🚨 Mass Session Revocation Script');
    console.log('=====================================\n');

    try {
      // Parse user IDs
      const userIds = await this.parseUserIds(options);
      
      if (userIds.length === 0) {
        console.log('❌ No user IDs provided. Exiting.');
        return;
      }

      console.log(`📋 Found ${userIds.length} users to process`);
      console.log(`🔍 Reason: ${options.reason || 'No reason provided'}`);
      console.log(`🧪 Dry run: ${options.dryRun ? 'Yes' : 'No'}\n`);

      if (options.dryRun) {
        await this.dryRun(userIds, options.reason);
      } else {
        await this.executeRevocation(userIds, options.reason);
      }

    } catch (error) {
      console.error('❌ Script failed:', error);
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private async parseUserIds(options: RevokeOptions): Promise<string[]> {
    if (options.users) {
      return options.users.flatMap(user => user.split(',').map(u => u.trim()));
    }

    if (options.file) {
      const filePath = path.resolve(options.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
    }

    return [];
  }

  private async dryRun(userIds: string[], reason?: string): Promise<void> {
    console.log('🔍 DRY RUN - No actual changes will be made\n');

    for (const userId of userIds) {
      try {
        const auditInfo = await this.sessionsService.getSecurityAuditInfo(userId);
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        console.log(`👤 User: ${user?.email || 'Unknown'} (${userId})`);
        console.log(`   Active sessions: ${auditInfo.activeSessions}`);
        console.log(`   Total sessions: ${auditInfo.totalSessions}`);
        console.log(`   Last login: ${auditInfo.lastLogin?.toISOString() || 'Never'}`);
        console.log(`   Suspicious activity: ${auditInfo.suspiciousActivity ? '⚠️ Yes' : '✅ No'}`);
        console.log('');
      } catch (error) {
        console.log(`❌ Error checking user ${userId}: ${error.message}`);
      }
    }
  }

  private async executeRevocation(userIds: string[], reason?: string): Promise<void> {
    console.log('🚀 Executing mass revocation...\n');

    const results = await this.sessionsService.revokeSessionsByUserIds(userIds, reason);
    
    console.log('📊 Results:');
    console.log('===========');
    
    let totalRevoked = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const [userId, revokedCount] of Object.entries(results)) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (revokedCount > 0) {
          console.log(`✅ ${user?.email || 'Unknown'} (${userId}): ${revokedCount} sessions revoked`);
          totalRevoked += revokedCount;
          successCount++;
        } else {
          console.log(`❌ ${user?.email || 'Unknown'} (${userId}): Failed to revoke sessions`);
          failureCount++;
        }
      } catch (error) {
        console.log(`❌ ${userId}: Error retrieving user info`);
        failureCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   Total users processed: ${userIds.length}`);
    console.log(`   Successful revocations: ${successCount}`);
    console.log(`   Failed revocations: ${failureCount}`);
    console.log(`   Total sessions revoked: ${totalRevoked}`);
    console.log(`   Reason: ${reason || 'No reason provided'}`);

    // Log to file for audit trail
    await this.logAuditTrail(userIds, results, reason);
  }

  private async logAuditTrail(
    userIds: string[], 
    results: { [userId: string]: number }, 
    reason?: string
  ): Promise<void> {
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'mass_session_revocation',
      reason,
      totalUsers: userIds.length,
      results,
      executedBy: process.env.USER || 'unknown',
    };

    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `mass-revoke-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(auditLog, null, 2));
    
    console.log(`📝 Audit log written to: ${logFile}`);
  }
}

// Parse command line arguments
function parseArgs(): RevokeOptions {
  const args = process.argv.slice(2);
  const options: RevokeOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--users':
        options.users = args[++i]?.split(',');
        break;
      case '--file':
        options.file = args[++i];
        break;
      case '--reason':
        options.reason = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
Mass Session Revocation Script

Usage:
  ts-node scripts/mass-revoke-sessions.ts --users user1,user2,user3 --reason "Security incident"
  ts-node scripts/mass-revoke-sessions.ts --file user-ids.txt --reason "Token compromise"
  ts-node scripts/mass-revoke-sessions.ts --users user1,user2 --dry-run

Options:
  --users <list>     Comma-separated list of user IDs
  --file <path>      Path to file containing user IDs (one per line)
  --reason <text>    Reason for revocation
  --dry-run          Show what would be done without making changes
  --verbose          Enable verbose logging
  --help             Show this help message

Examples:
  # Revoke sessions for specific users
  ts-node scripts/mass-revoke-sessions.ts --users clx123,clx456,clx789 --reason "Suspicious activity detected"

  # Revoke sessions from file
  ts-node scripts/mass-revoke-sessions.ts --file compromised-users.txt --reason "Token compromise"

  # Dry run to see what would happen
  ts-node scripts/mass-revoke-sessions.ts --users clx123,clx456 --dry-run
        `);
        process.exit(0);
    }
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  
  if (!options.users && !options.file) {
    console.error('❌ Error: Must provide either --users or --file option');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  const script = new MassRevokeScript();
  await script.run(options);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

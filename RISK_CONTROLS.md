# Risk Controls & Rollbacks

This document outlines the risk controls and rollback mechanisms implemented in the Safawinet application to ensure system reliability and security.

## 🚨 Bad Migration: Stop Deploy on Failed Migrate Deploy

### Overview
The deployment system includes comprehensive rollback capabilities to handle database migration failures while keeping the previous task set running.

### Implementation

#### Deployment Script with Rollback Protection
- **File**: `scripts/deploy-with-rollback.ts`
- **Features**:
  - Pre-deployment health checks
  - Database backup before migrations
  - Automatic rollback on migration failure
  - Keeps previous task set running during failures
  - Comprehensive logging and audit trail

#### Usage

```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod

# Deploy with custom options
ts-node scripts/deploy-with-rollback.ts --env prod --skip-migrations
ts-node scripts/deploy-with-rollback.ts --env staging --health-check-timeout 600
```

#### Rollback Process

1. **Pre-deployment Health Check**
   - Verify database connectivity
   - Check application health endpoint
   - Validate current system state

2. **Backup Current State**
   - Create database backup using `pg_dump`
   - Store current ECS task definition (staging/prod)
   - Log deployment state

3. **Migration Execution**
   - Run Prisma migrations with error handling
   - Monitor migration progress
   - Capture detailed logs

4. **Application Deployment**
   - Deploy application code
   - Wait for deployment stability
   - Verify health checks pass

5. **Rollback Triggers**
   - Migration failure
   - Health check failure
   - Deployment timeout
   - Manual rollback request

6. **Rollback Actions**
   - Restore database from backup
   - Rollback to previous task definition
   - Clear failed deployment artifacts
   - Send rollback notifications

### Configuration

```typescript
interface DeploymentConfig {
  environment: 'dev' | 'staging' | 'prod';
  skipMigrations?: boolean;
  forceRollback?: boolean;
  healthCheckTimeout?: number; // Default: 300 seconds
  maxRetries?: number; // Default: 30
}
```

## 🔐 Token Compromise: Endpoint to Revoke Family

### Overview
Security endpoints and admin scripts for handling token compromises and mass session revocation.

### Implementation

#### Session Management Service
- **File**: `server/api/src/auth/sessions.service.ts`
- **New Methods**:
  - `revokeTokenFamily()` - Revoke all sessions in a token family
  - `revokeAllUserSessions()` - Revoke all sessions for a user
  - `revokeSessionsByUserIds()` - Bulk revocation for multiple users
  - `getSecurityAuditInfo()` - Security audit information

#### API Endpoints
- **File**: `server/api/src/auth/sessions.controller.ts`
- **New Endpoints**:
  - `DELETE /v1/sessions/revoke-family/:familyId` - Revoke token family
  - `DELETE /v1/sessions/revoke-user/:userId` - Revoke all user sessions
  - `GET /v1/sessions/security-audit/:userId` - Security audit info

#### Mass Revocation Script
- **File**: `scripts/mass-revoke-sessions.ts`
- **Features**:
  - Bulk session revocation
  - Dry-run mode for testing
  - Audit trail logging
  - User-friendly CLI interface

### Usage

#### API Endpoints

```bash
# Revoke token family (security incident response)
curl -X DELETE \
  -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/v1/sessions/revoke-family/family-123

# Revoke all sessions for a user
curl -X DELETE \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Suspicious activity detected"}' \
  http://localhost:3000/v1/sessions/revoke-user/user-123

# Get security audit info
curl -X GET \
  -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/v1/sessions/security-audit/user-123
```

#### Mass Revocation Script

```bash
# Revoke sessions for specific users
npm run revoke:sessions -- --users user1,user2,user3 --reason "Security incident"

# Revoke sessions from file
npm run revoke:sessions -- --file compromised-users.txt --reason "Token compromise"

# Dry run to see what would happen
npm run revoke:sessions -- --users user1,user2 --dry-run

# Get help
npm run revoke:sessions -- --help
```

#### File Format for Bulk Revocation
```txt
# compromised-users.txt
user-id-1
user-id-2
user-id-3
# Comments are ignored
user-id-4
```

### Security Features

1. **Token Family Rotation**
   - Automatic token family rotation on refresh
   - Family-based revocation for security incidents
   - Audit trail for all revocation actions

2. **User Notifications**
   - Automatic notifications to users when sessions are revoked
   - Detailed reason logging
   - Security alert notifications

3. **Audit Trail**
   - All revocation actions logged with timestamps
   - User and admin action tracking
   - JSON audit logs for compliance

## 📧 Email Delivery: SES Sandbox for Dev

### Overview
Email delivery monitoring system with SES sandbox support for development and production health monitoring.

### Implementation

#### Email Monitoring Service
- **File**: `server/api/src/common/services/email-monitoring.service.ts`
- **Features**:
  - Real-time email delivery metrics
  - SES bounce/complaint processing
  - Production health checks
  - Automated alerts

#### Email Monitoring Controller
- **File**: `server/api/src/auth/email-monitoring.controller.ts`
- **Endpoints**:
  - `GET /v1/email-monitoring/health` - Email health status
  - `GET /v1/email-monitoring/metrics` - Delivery metrics
  - `GET /v1/email-monitoring/logs` - Email logs
  - `POST /v1/email-monitoring/ses/bounce` - SES bounce webhook
  - `POST /v1/email-monitoring/ses/complaint` - SES complaint webhook

#### Database Schema
- **File**: `server/api/prisma/schema.prisma`
- **New Model**: `EmailLog` for tracking delivery metrics

### Usage

#### Health Check

```bash
# Check email delivery health
npm run email:health

# Direct API call
curl -X GET \
  -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/v1/email-monitoring/health
```

#### Metrics Monitoring

```bash
# Get email metrics
curl -X GET \
  -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/v1/email-monitoring/metrics

# Get email logs
curl -X GET \
  -H "Authorization: Bearer <admin-token>" \
  "http://localhost:3000/v1/email-monitoring/logs?status=bounced&limit=50"
```

### Production Health Thresholds

| Metric | Threshold | Action |
|--------|-----------|---------|
| Bounce Rate | < 5% | Alert if exceeded |
| Complaint Rate | < 0.1% | Alert if exceeded |
| Delivery Rate | > 95% | Alert if below |
| Email Volume | > 100 emails | Sufficient data for metrics |

### SES Webhook Configuration

#### Bounce Processing
```json
{
  "bounce": {
    "bounceType": "Permanent",
    "bounceSubType": "Suppressed",
    "bouncedRecipients": [
      {
        "emailAddress": "user@example.com"
      }
    ],
    "timestamp": "2024-01-01T12:00:00Z",
    "feedbackId": "feedback-id-123"
  }
}
```

#### Complaint Processing
```json
{
  "complaint": {
    "complainedRecipients": [
      {
        "emailAddress": "user@example.com"
      }
    ],
    "complaintFeedbackType": "not-spam",
    "timestamp": "2024-01-01T12:00:00Z",
    "feedbackId": "feedback-id-456"
  }
}
```

### Automated Actions

1. **Permanent Bounces**
   - Mark user email as invalid
   - Create user notification
   - Update user preferences

2. **Complaints**
   - Unsubscribe user from emails
   - Create user notification
   - Update notification preferences

3. **Health Alerts**
   - Hourly health checks
   - Production environment alerts
   - Detailed recommendations

## 🔧 Configuration

### Environment Variables

```bash
# Email Monitoring
EMAIL_MONITORING_ENABLED=true
SES_WEBHOOK_SECRET=your-webhook-secret

# Deployment
DEPLOYMENT_HEALTH_CHECK_TIMEOUT=300
DEPLOYMENT_MAX_RETRIES=30

# Security
SESSION_REVOCATION_ENABLED=true
ADMIN_ROLE_REQUIRED=true
```

### SES Sandbox Configuration

#### Development Environment
```yaml
# docker-compose.yml
services:
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
```

#### Production Environment
```bash
# AWS SES Configuration
aws ses verify-email-identity --email-address your-domain@example.com
aws ses set-identity-notification-topic --identity your-domain@example.com --notification-type Bounce --sns-topic arn:aws:sns:region:account:topic-name
aws ses set-identity-notification-topic --identity your-domain@example.com --notification-type Complaint --sns-topic arn:aws:sns:region:account:topic-name
```

## 📊 Monitoring & Alerts

### Health Check Endpoints

1. **Application Health**: `/health`
2. **Email Health**: `/v1/email-monitoring/health`
3. **Database Health**: Built into application health

### Alerting Integration

```typescript
// TODO: Implement alerting system
private async sendHealthAlert(health: any): Promise<void> {
  // Slack integration
  // PagerDuty integration
  // Email alerts
  // SMS notifications
}
```

### Logging

- **Deployment Logs**: `logs/deployments/`
- **Revocation Logs**: `logs/mass-revoke-*.json`
- **Email Logs**: Database table `email_logs`
- **Application Logs**: Standard application logging

## 🚀 Deployment Checklist

### Pre-Production

- [ ] Email delivery health check passes
- [ ] SES sandbox testing completed
- [ ] Bounce/complaint webhooks configured
- [ ] Monitoring alerts configured
- [ ] Rollback procedures tested

### Production Deployment

- [ ] Run pre-deployment health check
- [ ] Execute deployment with rollback protection
- [ ] Verify post-deployment health
- [ ] Monitor email delivery metrics
- [ ] Check for any alerts

### Post-Deployment

- [ ] Monitor email bounce/complaint rates
- [ ] Verify all systems operational
- [ ] Update runbooks if needed
- [ ] Document any issues encountered

## 🔒 Security Considerations

1. **Admin Access Control**
   - Implement role-based access for admin endpoints
   - Audit all admin actions
   - Require multi-factor authentication

2. **Webhook Security**
   - Verify SES webhook signatures
   - Rate limit webhook endpoints
   - Monitor for suspicious activity

3. **Data Protection**
   - Encrypt sensitive data at rest
   - Secure audit logs
   - Regular security reviews

## 📚 Additional Resources

- [AWS SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [Prisma Migration Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

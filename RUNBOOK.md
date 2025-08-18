# Safawinet Production Runbook

## Emergency Contacts
- **DevOps Lead**: [Contact Info]
- **Security Team**: [Contact Info]
- **Database Admin**: [Contact Info]
- **AWS Support**: [Contact Info]

## Quick Reference

### Service URLs
- **Production API**: https://api.safawinet.com
- **Staging API**: https://staging-api.safawinet.com
- **Health Check**: https://api.safawinet.com/health
- **Sentry Dashboard**: [Sentry URL]
- **CloudWatch**: [CloudWatch URL]

### Critical Commands
```bash
# Check service status
aws ecs describe-services --cluster safawinet-prod --services safawinet-api-prod

# View logs
aws logs tail /ecs/safawinet-api --follow

# Scale service
aws ecs update-service --cluster safawinet-prod --service safawinet-api-prod --desired-count 2
```

---

## 1. Token Compromise Response

### Immediate Actions (0-15 minutes)

#### 1.1 Assess the Situation
- [ ] Determine scope of compromise (single user vs. widespread)
- [ ] Check Sentry for suspicious activity patterns
- [ ] Review CloudWatch logs for unusual authentication patterns
- [ ] Identify affected user accounts

#### 1.2 Emergency Response
```bash
# 1. Force logout all users (if widespread compromise)
curl -X POST https://api.safawinet.com/v1/auth/force-logout-all \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# 2. Revoke all refresh tokens
aws rds-data execute-statement \
  --resource-arn $DB_CLUSTER_ARN \
  --secret-arn $DB_SECRET_ARN \
  --sql "DELETE FROM refresh_sessions WHERE expires_at > NOW();"

# 3. Invalidate Redis cache
aws elasticache describe-cache-clusters --cache-cluster-id safawinet-redis
redis-cli -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD FLUSHALL
```

#### 1.3 Security Measures
- [ ] Rotate JWT secrets in AWS Secrets Manager
- [ ] Update application environment variables
- [ ] Restart ECS services to pick up new secrets
- [ ] Enable enhanced monitoring

#### 1.4 Communication
- [ ] Notify security team
- [ ] Send security alert to affected users
- [ ] Update status page
- [ ] Prepare incident report

### Recovery Steps (15-60 minutes)

#### 1.5 Service Restart
```bash
# Restart ECS services with new secrets
aws ecs update-service \
  --cluster safawinet-prod \
  --service safawinet-api-prod \
  --force-new-deployment

# Verify service health
aws ecs describe-services --cluster safawinet-prod --services safawinet-api-prod
```

#### 1.6 Verification
- [ ] Test authentication endpoints
- [ ] Verify new tokens are being issued
- [ ] Check that old tokens are rejected
- [ ] Monitor error rates in Sentry

---

## 2. Forced Logout Procedures

### 2.1 Single User Logout
```bash
# Logout specific user
curl -X POST https://api.safawinet.com/v1/auth/force-logout \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_id_here"}'
```

### 2.2 Bulk User Logout
```bash
# Logout users by criteria (e.g., last login time)
aws rds-data execute-statement \
  --resource-arn $DB_CLUSTER_ARN \
  --secret-arn $DB_SECRET_ARN \
  --sql "DELETE FROM refresh_sessions WHERE user_id IN (SELECT id FROM users WHERE last_login_at < '2024-01-01');"
```

### 2.3 Global Logout (Emergency)
```bash
# Emergency: Logout all users
aws rds-data execute-statement \
  --resource-arn $DB_CLUSTER_ARN \
  --secret-arn $DB_SECRET_ARN \
  --sql "DELETE FROM refresh_sessions;"

# Clear Redis session cache
redis-cli -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD FLUSHDB
```

---

## 3. SES Bounce Handling

### 3.1 Monitor SES Bounces
```bash
# Check SES bounce metrics
aws ses get-send-statistics --region us-east-1

# List recent bounces
aws ses get-bounce-list --region us-east-1
```

### 3.2 Process Bounce Notifications

#### 3.2.1 Hard Bounces
```bash
# Mark email as invalid in database
aws rds-data execute-statement \
  --resource-arn $DB_CLUSTER_ARN \
  --secret-arn $DB_SECRET_ARN \
  --sql "UPDATE users SET email_status = 'bounced' WHERE email = 'bounced_email@example.com';"
```

#### 3.2.2 Soft Bounces
```bash
# Increment bounce count
aws rds-data execute-statement \
  --resource-arn $DB_CLUSTER_ARN \
  --secret-arn $DB_SECRET_ARN \
  --sql "UPDATE users SET bounce_count = bounce_count + 1 WHERE email = 'soft_bounce@example.com';"
```

### 3.3 Bounce Threshold Management
```bash
# Disable users with excessive bounces
aws rds-data execute-statement \
  --resource-arn $DB_CLUSTER_ARN \
  --secret-arn $DB_SECRET_ARN \
  --sql "UPDATE users SET is_active = false WHERE bounce_count >= 5;"
```

---

## 4. Performance Issues

### 4.1 High Response Times
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=safawinet-api-prod \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Scale up service
aws ecs update-service \
  --cluster safawinet-prod \
  --service safawinet-api-prod \
  --desired-count 4
```

### 4.2 Database Performance
```bash
# Check RDS performance insights
aws rds describe-db-instances --db-instance-identifier safawinet-prod

# Check slow queries
aws rds-data execute-statement \
  --resource-arn $DB_CLUSTER_ARN \
  --secret-arn $DB_SECRET_ARN \
  --sql "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

---

## 5. Database Issues

### 5.1 Connection Pool Exhaustion
```bash
# Check current connections
aws rds-data execute-statement \
  --resource-arn $DB_CLUSTER_ARN \
  --secret-arn $DB_SECRET_ARN \
  --sql "SELECT count(*) FROM pg_stat_activity;"

# Kill long-running queries
aws rds-data execute-statement \
  --resource-arn $DB_CLUSTER_ARN \
  --secret-arn $DB_SECRET_ARN \
  --sql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';"
```

### 5.2 Database Failover
```bash
# Check RDS cluster status
aws rds describe-db-clusters --db-cluster-identifier safawinet-prod

# Force failover if needed
aws rds failover-db-cluster --db-cluster-identifier safawinet-prod
```

---

## 6. Monitoring and Alerts

### 6.1 Critical Alerts
- **ALB 5xx errors > 1%**
- **ECS CPU > 70% for 5 minutes**
- **RDS connections > 80%**
- **Redis memory > 80%**
- **Sentry error rate > 5%**

### 6.2 Alert Response
```bash
# Check alert status
aws cloudwatch describe-alarms --alarm-names "Safawinet-ALB-5xx-Errors"

# Acknowledge alert
aws cloudwatch set-alarm-state \
  --alarm-name "Safawinet-ALB-5xx-Errors" \
  --state-value ALARM \
  --state-reason "Investigating high error rate"
```

---

## 7. Backup and Recovery

### 7.1 Database Backup
```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier safawinet-prod \
  --db-snapshot-identifier safawinet-manual-$(date +%Y%m%d-%H%M%S)

# List recent snapshots
aws rds describe-db-snapshots --db-instance-identifier safawinet-prod
```

### 7.2 Restore from Snapshot
```bash
# Restore to new instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier safawinet-restore \
  --db-snapshot-identifier snapshot-id-here
```

---

## 8. Security Incidents

### 8.1 Unauthorized Access
- [ ] Immediately revoke compromised credentials
- [ ] Check CloudTrail logs for suspicious activity
- [ ] Review IAM user access
- [ ] Rotate affected secrets

### 8.2 DDoS Attack
- [ ] Enable AWS Shield Advanced (if available)
- [ ] Configure WAF rules
- [ ] Scale up resources
- [ ] Contact AWS support

---

## 9. Maintenance Procedures

### 9.1 Scheduled Maintenance
```bash
# Notify users
curl -X POST https://api.safawinet.com/v1/notifications/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Scheduled maintenance in 30 minutes", "duration": "2 hours"}'

# Deploy updates
aws ecs update-service \
  --cluster safawinet-prod \
  --service safawinet-api-prod \
  --force-new-deployment
```

### 9.2 Emergency Maintenance
- [ ] Post status update
- [ ] Execute maintenance procedures
- [ ] Verify service health
- [ ] Update status page

---

## 10. Post-Incident Procedures

### 10.1 Documentation
- [ ] Complete incident report
- [ ] Update runbook with lessons learned
- [ ] Schedule post-mortem meeting
- [ ] Update monitoring and alerting

### 10.2 Follow-up Actions
- [ ] Implement preventive measures
- [ ] Update security policies
- [ ] Train team on new procedures
- [ ] Review and update runbook

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| DevOps Lead | [Name] | [Phone] | [Email] |
| Security Team | [Name] | [Phone] | [Email] |
| Database Admin | [Name] | [Phone] | [Email] |
| AWS Support | - | - | [AWS Support URL] |

**Last Updated**: [Date]
**Version**: 1.0

# Safawinet Deployment Guide

This guide covers the complete Dev → Staging → Prod deployment path for the Safawinet API.

## 🏗️ Architecture Overview

### Environments

1. **Development (Dev)**
   - **Stack**: Docker Compose with local services
   - **Database**: PostgreSQL 15 (local container)
   - **Cache**: Redis 7 (local container)
   - **Email**: Mailhog (local SMTP testing)
   - **Observability**: OpenTelemetry Collector (local)
   - **Domain**: `localhost:3000`

2. **Staging**
   - **Stack**: Same as production, smaller sizes
   - **Database**: RDS PostgreSQL (t3.micro)
   - **Cache**: ElastiCache Redis (cache.t3.micro)
   - **Email**: AWS SES
   - **Observability**: OpenTelemetry Collector
   - **Domain**: `api-stg.safawinet.com`
   - **Security**: Basic auth on `/docs`

3. **Production**
   - **Stack**: AWS ECS Fargate + RDS + ElastiCache + SES + Secrets Manager
   - **Database**: RDS PostgreSQL (t3.medium)
   - **Cache**: ElastiCache Redis (cache.t3.micro)
   - **Email**: AWS SES
   - **Observability**: OpenTelemetry Collector
   - **Domain**: `api.safawinet.com`
   - **Deployment**: Rolling with health checks

## 🚀 Quick Start

### Development Environment

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd safawinet
   cp env.template .env
   # Edit .env with your development values
   ```

2. **Start development environment**:
   ```bash
   docker-compose up -d
   ```

3. **Access services**:
   - API: http://localhost:3000
   - Swagger Docs: http://localhost:3000/docs
   - Health Check: http://localhost:3000/health
   - Mailhog: http://localhost:8025
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### Staging Environment

1. **Setup environment variables**:
   ```bash
   cp env.staging .env.staging
   # Edit with staging values
   ```

2. **Deploy to staging**:
   ```bash
   # Push to develop branch triggers staging deployment
   git push origin develop
   ```

3. **Access staging**:
   - API: https://api-stg.safawinet.com
   - Docs: https://api-stg.safawinet.com/docs (basic auth required)

### Production Environment

1. **Setup AWS infrastructure**:
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform plan -var-file=prod.tfvars
   terraform apply -var-file=prod.tfvars
   ```

2. **Deploy to production**:
   ```bash
   # Push to main branch triggers production deployment
   git push origin main
   ```

3. **Access production**:
   - API: https://api.safawinet.com
   - Docs: https://api.safawinet.com/docs

## 🔧 Configuration Management

### Environment Variables

All environments use the same configuration keys with different values:

| Key | Dev | Staging | Production |
|-----|-----|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `LOG_LEVEL` | `debug` | `info` | `warn` |
| `RATE_LIMIT_LIMIT` | `1000` | `500` | `100` |
| `EMAIL_HOST` | `mailhog` | `email-smtp.us-east-1.amazonaws.com` | `email-smtp.us-east-1.amazonaws.com` |

### Secrets Management

- **Development**: Local `.env` file
- **Staging**: AWS Secrets Manager
- **Production**: AWS Secrets Manager

### Database Migrations

Migrations are automatically run during deployment:

1. **Development**: `npx prisma migrate dev`
2. **Staging**: ECS one-off task during deployment
3. **Production**: ECS one-off task during deployment

## 🔄 CI/CD Pipeline

### Pull Request Flow

1. **Lint**: ESLint + Prettier
2. **Test**: Unit tests + E2E tests
3. **Build**: Docker image build (not pushed)

### Main Branch Flow

1. **Test**: Same as PR
2. **Build**: Docker image
3. **Push**: To ECR
4. **Deploy**: ECS service update
5. **Migrate**: Database migration
6. **Health Check**: Verify deployment

### Deployment Strategy

- **Staging**: Rolling deployment
- **Production**: Rolling deployment with health checks
- **Rollback**: Manual via ECS console or CLI

## 📊 Monitoring & Observability

### Health Checks

- **Endpoint**: `/health`
- **Interval**: 30s
- **Timeout**: 5s
- **Retries**: 3
- **Start Period**: 60s

### CloudWatch Alarms

- **5xx Errors**: > 5% for 5 minutes
- **4xx Errors**: > 10% for 5 minutes
- **Response Time**: > 2s for 5 minutes
- **CPU Utilization**: > 80% for 5 minutes
- **Memory Utilization**: > 80% for 5 minutes

### Logging

- **Format**: JSON structured logs
- **Level**: Configurable per environment
- **Destination**: CloudWatch Logs
- **Retention**: 30 days

## 🔒 Security

### Network Security

- **VPC**: Private subnets for databases
- **Security Groups**: Minimal required access
- **ALB**: Public-facing with SSL termination

### Authentication

- **Development**: None
- **Staging**: Basic auth on `/docs`
- **Production**: JWT-based authentication

### Secrets

- **Development**: Local files
- **Staging/Production**: AWS Secrets Manager
- **Rotation**: Manual (quarterly recommended)

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check security groups
   - Verify credentials in Secrets Manager
   - Check RDS status

2. **ECS Service Unhealthy**
   - Check container logs in CloudWatch
   - Verify health check endpoint
   - Check resource limits

3. **Migration Failed**
   - Check database connectivity
   - Verify migration files
   - Check ECS task logs

### Debug Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster safawinet-prod --services safawinet-api-prod

# View container logs
aws logs tail /ecs/safawinet-api --follow

# Check ALB target health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>

# Test database connection
aws ecs run-task --cluster safawinet-prod --task-definition safawinet-api-prod --overrides '{"containerOverrides":[{"name":"safawinet-api","command":["npx","prisma","db","push"]}]}'
```

## 📈 Scaling

### Auto Scaling

- **CPU**: Scale up at 70%, down at 30%
- **Memory**: Scale up at 80%, down at 40%
- **Target**: 2-4 instances (production)

### Manual Scaling

```bash
# Scale ECS service
aws ecs update-service --cluster safawinet-prod --service safawinet-api-prod --desired-count 4

# Scale RDS
aws rds modify-db-instance --db-instance-identifier safawinet-prod --db-instance-class db.t3.large
```

## 🔄 Rollback Procedure

1. **Identify the issue**:
   ```bash
   aws ecs describe-services --cluster safawinet-prod --services safawinet-api-prod
   ```

2. **Rollback to previous version**:
   ```bash
   aws ecs update-service --cluster safawinet-prod --service safawinet-api-prod --task-definition safawinet-api-prod:previous
   ```

3. **Verify rollback**:
   ```bash
   curl -f https://api.safawinet.com/health
   ```

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)

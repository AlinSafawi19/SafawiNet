# 🚀 Server Deployment Guide

This guide will help you deploy your NestJS API server to production with optimal performance and reliability.

## Architecture Overview

Your server includes:
- **NestJS API** with TypeScript
- **PostgreSQL** database with Prisma ORM
- **Redis** for caching and sessions
- **Docker** containerization
- **OpenTelemetry** monitoring
- **Health checks** and monitoring

## 🎯 **Recommended Deployment Options**

### 1. **AWS ECS + RDS (Best for Production)**
- ✅ Fully managed services
- ✅ Auto-scaling
- ✅ High availability
- ✅ Built-in monitoring
- ✅ Cost-effective

### 2. **DigitalOcean App Platform (Easiest)**
- ✅ Simple deployment
- ✅ Managed database
- ✅ Automatic scaling
- ✅ Great for startups

### 3. **Railway (Developer-Friendly)**
- ✅ One-click deployment
- ✅ Built-in database
- ✅ Simple configuration
- ✅ Great for MVP

## 🚀 **Option 1: AWS ECS + RDS (Recommended)**

### Prerequisites
- AWS account
- AWS CLI installed
- Docker installed locally

### Step 1: Prepare AWS Resources

#### 1.1 Create RDS PostgreSQL Database
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier safawinet-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password "your-secure-password" \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name your-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

#### 1.2 Create ElastiCache Redis
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id safawinet-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --subnet-group-name your-subnet-group
```

### Step 2: Build and Push Docker Image

#### 2.1 Create ECR Repository
```bash
# Create ECR repository
aws ecr create-repository --repository-name safawinet-api

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

#### 2.2 Build and Push Image
```bash
cd server/api

# Build production image
docker build -t safawinet-api .

# Tag for ECR
docker tag safawinet-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/safawinet-api:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/safawinet-api:latest
```

### Step 3: Create ECS Task Definition

Create `task-definition.json`:
```json
{
  "family": "safawinet-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "safawinet-api",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/safawinet-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:safawinet/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:safawinet/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/safawinet-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Step 4: Create ECS Service

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name safawinet-cluster

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster safawinet-cluster \
  --service-name safawinet-api-service \
  --task-definition safawinet-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxxx],securityGroups=[sg-xxxxxxxxx],assignPublicIp=ENABLED}"
```

## 🚀 **Option 2: DigitalOcean App Platform (Easiest)**

### Step 1: Prepare Repository
```bash
# Push to GitHub
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Create App on DigitalOcean
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Select the `server/api` directory as the source

### Step 3: Configure App Settings
```yaml
# .do/app.yaml
name: safawinet-api
services:
- name: api
  source_dir: server/api
  github:
    repo: yourusername/safawinet
    branch: main
  run_command: npm run start:prod
  environment_slug: node-js
  instance_count: 2
  instance_size_slug: basic-xxs
  http_port: 3000
  health_check:
    http_path: /health
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "3000"
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  - key: REDIS_URL
    value: ${redis.REDIS_URL}
  - key: JWT_SECRET
    value: ${JWT_SECRET}
    type: SECRET

databases:
- name: db
  engine: PG
  version: "15"
  size: db-s-1vcpu-1gb
  num_nodes: 1

redis:
- name: redis
  size: db-s-1vcpu-1gb
  version: "7"
```

## 🚀 **Option 3: Railway (Developer-Friendly)**

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Deploy to Railway
```bash
cd server/api

# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
railway variables set REDIS_URL=${{Redis.REDIS_URL}}
railway variables set JWT_SECRET=your-secure-jwt-secret

# Deploy
railway up
```

## 🔧 **Environment Variables Setup**

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Redis
REDIS_URL=redis://username:password@host:port

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=3000

# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100
LOGIN_BURST_LIMIT=300

# BullMQ
BULLMQ_PREFIX=safawinet
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# Cookies
COOKIE_DOMAIN=yourdomain.com

# Prisma
PRISMA_CLIENT_ENGINE_TYPE=dataproxy

# Node.js
NODE_OPTIONS=--max-old-space-size=2048
```

## 📊 **Monitoring and Logging**

### 1. Health Checks
Your app includes health checks at `/health` endpoint.

### 2. Error Tracking
- **Error tracking** with Sentry

### 3. Metrics
- **OpenTelemetry** integration
- **Custom metrics** for business logic
- **Performance monitoring**

## 🔒 **Security Best Practices**

### 1. Environment Variables
- Store secrets in AWS Secrets Manager or similar
- Never commit secrets to Git
- Use different secrets for each environment

### 2. Database Security
- Use connection pooling
- Enable SSL/TLS
- Regular backups
- Access control

### 3. Application Security
- Helmet.js for security headers
- Rate limiting
- Input validation
- CORS configuration

## 🚀 **Deployment Checklist**

- [ ] Code pushed to GitHub
- [ ] Environment variables configured
- [ ] Database created and accessible
- [ ] Redis instance created
- [ ] Docker image built and pushed
- [ ] ECS service created (or alternative)
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] SSL certificate active
- [ ] Domain configured
- [ ] Load balancer configured (if needed)

## 🔄 **Continuous Deployment**

### GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths: ['server/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and push Docker image
        run: |
          cd server/api
          docker build -t safawinet-api .
          docker tag safawinet-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/safawinet-api:latest
          docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/safawinet-api:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster safawinet-cluster --service safawinet-api-service --force-new-deployment
```

## 🆘 **Troubleshooting**

### Common Issues
1. **Database connection failed**: Check DATABASE_URL and network access
2. **Redis connection failed**: Verify REDIS_URL and security groups
3. **Build failures**: Check Dockerfile and dependencies
4. **Health check failures**: Verify health endpoint and dependencies

### Debug Commands
```bash
# Check ECS service status
aws ecs describe-services --cluster safawinet-cluster --services safawinet-api-service

# View logs
aws logs tail /ecs/safawinet-api --follow

# Check task health
aws ecs describe-tasks --cluster safawinet-cluster --tasks task-id
```

## 📈 **Performance Optimization**

### 1. Database
- Enable connection pooling
- Use read replicas for read-heavy operations
- Optimize queries with indexes

### 2. Caching
- Use Redis for session storage
- Cache frequently accessed data
- Implement cache invalidation strategies

### 3. Application
- Enable gzip compression
- Use CDN for static assets
- Implement request queuing

---

**Next Step**: Set up database hosting (see DATABASE_DEPLOYMENT.md)

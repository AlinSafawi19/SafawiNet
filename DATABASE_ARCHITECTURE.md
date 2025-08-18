# Database Architecture

## Overview

This project follows a **three-environment database strategy** with complete isolation between development, staging, and production environments.

## Database Environments

### 1. Development Environment
- **Database Name**: `safawinet_dev`
- **Configuration**: `env.dev`
- **Docker Compose**: `docker-compose.yml`
- **Data Volume**: `postgres_data`
- **Purpose**: Local development and testing
- **Credentials**: Hardcoded (acceptable for local dev)

### 2. Staging Environment
- **Database Name**: `safawinet_staging`
- **Configuration**: `env.staging`
- **Docker Compose**: `docker-compose.staging.yml`
- **Data Volume**: `postgres_staging_data`
- **Purpose**: Pre-production testing and validation
- **Credentials**: Environment variables (secure)

### 3. Production Environment
- **Database Name**: `safawinet_prod`
- **Configuration**: `env.prod`
- **Docker Compose**: `docker-compose.prod.yml`
- **Data Volume**: `postgres_prod_data`
- **Purpose**: Live production environment
- **Credentials**: Environment variables (secure)

## Key Benefits

### ✅ **Complete Isolation**
- Each environment has its own database instance
- No risk of cross-contamination between environments
- Separate data volumes ensure data persistence

### ✅ **Environment-Specific Configuration**
- Different resource limits for each environment
- Appropriate security settings per environment
- Environment-specific logging and monitoring

### ✅ **Security Best Practices**
- Development: Hardcoded credentials (acceptable for local)
- Staging/Production: Environment variables (secure)
- Different rate limiting per environment

### ✅ **Scalability**
- Production has higher resource limits
- Staging has moderate resource limits
- Development has minimal resource usage

## Database URLs

```bash
# Development
DATABASE_URL=postgresql://postgres:alin123M@postgres:5432/safawinet_dev

# Staging
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Production
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
```

## Running Different Environments

```bash
# Development
docker-compose up

# Staging
docker-compose -f docker-compose.staging.yml up

# Production
docker-compose -f docker-compose.prod.yml up
```

## Best Practices Implemented

1. **Database Naming Convention**: `safawinet_{environment}`
2. **Volume Naming**: `postgres_{environment}_data`
3. **Container Naming**: `safawinet-postgres-{environment}`
4. **Environment Variables**: Used for staging/prod, hardcoded for dev
5. **Resource Limits**: Appropriate for each environment's needs
6. **Health Checks**: Implemented for all database services

## Migration Strategy

When deploying schema changes:

1. **Development**: Test migrations locally first
2. **Staging**: Deploy and test migrations in staging environment
3. **Production**: Deploy migrations to production after staging validation

This ensures safe, tested deployments with rollback capabilities.

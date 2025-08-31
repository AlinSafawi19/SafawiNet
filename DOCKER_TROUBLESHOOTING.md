# Docker SIGTERM Troubleshooting Guide

## Problem
The application is failing with a SIGTERM error during the startup process, specifically during the Prisma migration deployment.

## Root Causes
1. **Resource Constraints**: Container running out of memory or CPU
2. **Database Connection Timeout**: Prisma migrations timing out
3. **Process Termination**: Docker killing the process due to health checks
4. **Network Issues**: Slow or unreliable network connections

## Solutions

### Solution 1: Use Improved Startup Script (Recommended)

The main `Dockerfile.dev` has been updated with:
- Better error handling and retry logic
- Resource limits and memory management
- Improved database connection checking
- Comprehensive logging

### Solution 2: Use NPM Scripts Alternative

If shell scripts continue to fail, use the alternative approach:

1. Update your `docker-compose.yml` to use the alternative Dockerfile:
```yaml
api:
  build:
    context: ./server/api
    dockerfile: Dockerfile.dev.npm  # Use the npm-based approach
```

### Solution 3: Manual Debugging Steps

1. **Check Docker Resources**:
```bash
docker system df
docker stats
```

2. **Increase Docker Resources**:
   - In Docker Desktop: Settings > Resources > Memory (increase to 4GB+)
   - In Docker Desktop: Settings > Resources > CPUs (increase to 2+)

3. **Check Container Logs**:
```bash
docker-compose logs api
docker-compose logs postgres
```

4. **Test Database Connection**:
```bash
docker-compose exec postgres psql -U postgres -d safawinet_dev -c "SELECT 1;"
```

### Solution 4: Environment-Specific Fixes

#### For Windows/WSL2:
```bash
# Increase WSL2 memory limit
# Add to %USERPROFILE%\.wslconfig:
[wsl2]
memory=4GB
processors=2
```

#### For Linux:
```bash
# Increase Docker daemon memory limit
sudo systemctl edit docker
# Add:
[Service]
LimitMEMLOCK=infinity
```

### Solution 5: Step-by-Step Recovery

1. **Clean up existing containers**:
```bash
docker-compose down -v
docker system prune -f
```

2. **Rebuild with fresh cache**:
```bash
docker-compose build --no-cache api
```

3. **Start services one by one**:
```bash
docker-compose up postgres -d
# Wait for postgres to be healthy
docker-compose up redis -d
# Wait for redis to be healthy
docker-compose up api
```

### Solution 6: Alternative Docker Compose Configuration

If the main configuration still fails, try this minimal setup:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: safawinet_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: alin123M
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build:
      context: ./server/api
      dockerfile: Dockerfile.dev.npm
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:alin123M@postgres:5432/safawinet_dev
      - NODE_ENV=development
    depends_on:
      - postgres
    volumes:
      - ./server/api:/app
      - /app/node_modules

volumes:
  postgres_data:
```

## Prevention

1. **Monitor Resource Usage**: Use `docker stats` to monitor container resource usage
2. **Set Appropriate Limits**: Configure memory and CPU limits in docker-compose.yml
3. **Use Health Checks**: Implement proper health checks for all services
4. **Implement Retry Logic**: Always include retry mechanisms for database operations
5. **Log Everything**: Comprehensive logging helps identify issues quickly

## Common Error Messages and Solutions

### "SIGTERM" Error
- **Cause**: Process terminated by Docker
- **Solution**: Increase memory limits, add retry logic

### "Connection timeout"
- **Cause**: Database not ready
- **Solution**: Implement proper wait logic, increase timeout values

### "Out of memory"
- **Cause**: Container exceeded memory limit
- **Solution**: Increase memory limits, optimize application

### "Permission denied"
- **Cause**: File permission issues
- **Solution**: Check file permissions, use proper user in Dockerfile

## Debugging Commands

```bash
# Check container status
docker-compose ps

# View real-time logs
docker-compose logs -f api

# Execute commands in running container
docker-compose exec api sh

# Check resource usage
docker stats

# Inspect container configuration
docker inspect safawinet-api

# Test database connectivity from host
psql -h localhost -U postgres -d safawinet_dev
```

## Emergency Recovery

If all else fails:

1. **Reset everything**:
```bash
docker-compose down -v
docker system prune -a -f
docker volume prune -f
```

2. **Start fresh**:
```bash
docker-compose up --build
```

3. **If still failing, run locally**:
```bash
cd server/api
npm install
npm run start:dev
```

## Support

If you continue to experience issues:
1. Check the Docker logs for specific error messages
2. Verify your Docker and Docker Compose versions
3. Ensure sufficient system resources are available
4. Consider running the application locally for development

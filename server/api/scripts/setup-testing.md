# Cross-Cutting Features Testing Guide (Docker)

## 🚀 Quick Start Testing

### 1. **Start Your Docker Containers**
```bash
# From the root directory
docker-compose up -d

# Or if using Makefile
make up
```

### 2. **Run the Docker Test Suite**
```bash
cd server/api/scripts
.\test-cross-cutting-features-docker.ps1
```

### 3. **Manual Testing Commands**

#### **Test Security Headers**
```bash
curl -I http://localhost:3000/health
```
Look for: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`

#### **Test Request ID Tracking**
```bash
curl -H "X-Request-ID: test-123" http://localhost:3000/health
```
Check response headers for `X-Request-ID: test-123`

#### **Test Performance Monitoring** (requires auth)
```bash
# First get a token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Then test performance endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/performance/stats
```

#### **Test Background Jobs**
```bash
# Check queue status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/performance/queues

# Trigger manual cleanup
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/performance/cleanup/tokens
```

## 🔍 What to Look For

### **1. Container Logs**
You should see structured JSON logs like:
```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-456",
  "service": "safawinet-api",
  "environment": "development",
  "msg": "Request completed: GET /health in 15ms"
}
```

**View logs with:**
```bash
# Follow API logs
docker-compose logs -f api

# View recent logs
docker-compose logs --tail=50 api

# View all container logs
docker-compose logs
```

### **2. Redis Queues**
Check Redis for background job queues:
```bash
# Access Redis container
docker-compose exec redis redis-cli

# Check for Safawinet keys
> KEYS *safawinet*

# Check queue lengths
> LLEN safawinet:email:wait
> LLEN safawinet:security:wait
> LLEN safawinet:maintenance:wait

# Monitor Redis in real-time
> MONITOR
```

### **3. OpenTelemetry** (if collector running)
- Traces and metrics sent to `http://localhost:4318`
- Check collector logs: `docker-compose logs otel-collector`

### **4. Cron Jobs**
Watch for scheduled job logs:
- Every 5 minutes: Token cleanup
- Every hour: Notification cleanup  
- Daily at 2 AM: Session cleanup
- Daily at 3 AM: Database cleanup
- Daily at 4 AM: Log rotation

**Monitor cron jobs:**
```bash
# Follow API logs for cron job messages
docker-compose logs -f api | grep -i "cron\|cleanup\|scheduled"
```

## 🎯 Expected Results

### **✅ All Tests Should Pass:**
- Docker Containers: All running and healthy
- Redis Connection: PONG response
- API Health: 200 OK
- Security Headers: All present
- Request ID: Propagated correctly
- CORS: Properly configured
- Background Jobs: Queues accessible
- Performance Monitoring: Endpoints working
- Cron Jobs: Manual triggers working
- Logging: Structured logs visible
- Error Handling: 404 for invalid routes

### **📊 Performance Targets:**
- Auth routes: P99 < 120ms
- Login burst: 300 RPS capacity
- Database queries: < 15 per login flow

## 🛠 Troubleshooting

### **If Tests Fail:**

1. **Check containers are running**: `docker-compose ps`
2. **Check API health**: `curl http://localhost:3000/health`
3. **Check Redis**: `docker-compose exec redis redis-cli ping`
4. **Check environment variables**: Verify `.env` file
5. **Check container logs**: `docker-compose logs api`
6. **Restart containers**: `docker-compose restart`

### **Common Docker Issues:**

- **Containers not starting**: Check `docker-compose logs`
- **Redis connection failed**: Ensure Redis container is running
- **Port conflicts**: Check if port 3000 is available
- **Environment variables**: Verify `.env` file is properly configured
- **Authentication required**: Some endpoints need valid JWT tokens

### **Docker Commands for Debugging:**

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs -f api
docker-compose logs -f redis

# Restart specific service
docker-compose restart api

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Access container shell
docker-compose exec api sh
docker-compose exec redis redis-cli

# Check container resources
docker stats
```

## 🎉 Success Indicators

When everything is working, you'll see:
- ✅ All test cases passing
- 📝 Structured logs with request IDs in container logs
- 🔒 Security headers on all responses
- ⚡ Performance metrics being collected
- 🔄 Background jobs processing in Redis
- 🕐 Cron jobs running on schedule
- 📊 Performance budgets being monitored
- 🐳 All Docker containers healthy

## 🚀 Next Steps

1. **Configure Sentry**: Add your DSN to `.env`
2. **Set up OpenTelemetry Collector**: For production tracing
3. **Configure monitoring**: Set up dashboards for metrics
4. **Performance testing**: Run k6 tests for load validation
5. **Security audit**: Review security headers and CORS settings
6. **Production deployment**: Update Docker configurations for production

## 📋 Docker-Specific Testing Checklist

- [ ] `docker-compose up -d` - All containers start successfully
- [ ] `docker-compose ps` - All containers show "Up" status
- [ ] `curl http://localhost:3000/health` - API responds with 200
- [ ] `docker-compose exec redis redis-cli ping` - Redis responds with PONG
- [ ] `docker-compose logs api` - Shows structured JSON logs
- [ ] Security headers present in API responses
- [ ] Request ID tracking working
- [ ] Background job queues accessible
- [ ] Performance monitoring endpoints working
- [ ] Cron jobs executing on schedule

# Manual Testing Guide for Cross-Cutting Features

## 🚀 Quick Start

### 1. **Start Docker Containers**
```bash
# From project root
docker-compose up -d

# Check status
docker-compose ps
```

### 2. **Test Basic API Health**
```bash
curl http://localhost:3000/health
```
**Expected**: `{"status":"ok","timestamp":"2024-01-15T..."}`

## 🔍 Testing Each Feature

### **1. Security Headers**
```bash
curl -I http://localhost:3000/health
```
**Look for these headers:**
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### **2. Request ID Tracking**
```bash
curl -H "X-Request-ID: test-123" http://localhost:3000/health
```
**Check response headers for:** `X-Request-ID: test-123`

### **3. Structured Logging**
```bash
# Make a request
curl http://localhost:3000/health

# Check container logs
docker-compose logs api
```
**Look for JSON logs like:**
```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123e4567-e89b-12d3-a456-426614174000",
  "service": "safawinet-api",
  "environment": "development",
  "msg": "Request completed: GET /health in 15ms"
}
```

### **4. Redis Background Jobs**
```bash
# Check Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG

# Check for Safawinet queues
docker-compose exec redis redis-cli KEYS "*safawinet*"
# Should show: safawinet:email:*, safawinet:security:*, safawinet:maintenance:*
```

### **5. Performance Monitoring** (requires auth)
```bash
# First get a token (if you have test user)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safawinet.com","password":"admin123456"}'

# Then test performance endpoints
curl -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWVnazQyN3IwMDA1cDc3Yjkzc3VtYW93IiwiZW1haWwiOiJhZG1pbkBzYWZhd2luZXQuY29tIiwidmVyaWZpZWQiOnRydWUsImlhdCI6MTc1NTQ4ODIzMywiZXhwIjoxNzU1NDg5MTMzfQ.ASthdwIXR_Yel_ndrcRR-3HHbNDcy_laFKagqUYiltI" \
  http://localhost:3000/performance/stats
```

### **6. Error Handling**
```bash
# Test 404 handling
curl http://localhost:3000/non-existent-endpoint
# Should return 404 with proper error format
```

## 🐳 Docker Commands for Debugging

### **View Logs**
```bash
# Follow API logs
docker-compose logs -f api

# View recent logs
docker-compose logs --tail=50 api

# View all container logs
docker-compose logs
```

### **Container Management**
```bash
# Check container status
docker-compose ps

# Restart specific service
docker-compose restart api

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Access container shell
docker-compose exec api sh
docker-compose exec redis redis-cli
```

### **Redis Commands**
```bash
# Access Redis
docker-compose exec redis redis-cli

# Check queue lengths
> LLEN safawinet:email:wait
> LLEN safawinet:security:wait
> LLEN safawinet:maintenance:wait

# Monitor Redis in real-time
> MONITOR
```

## ✅ Success Checklist

- [ ] `docker-compose ps` - All containers show "Up" status
- [ ] `curl http://localhost:3000/health` - Returns 200 OK
- [ ] Security headers present in API responses
- [ ] Request ID tracking working
- [ ] Structured JSON logs visible in container logs
- [ ] Redis connection working (`PONG` response)
- [ ] Background job queues exist in Redis
- [ ] Error handling returns proper 404 for invalid routes

## 🚨 Troubleshooting

### **If containers won't start:**
```bash
# Check logs
docker-compose logs

# Check if ports are in use
netstat -an | findstr :3000
netstat -an | findstr :6379

# Restart Docker Desktop (Windows)
```

### **If API is not responding:**
```bash
# Check if API container is running
docker-compose ps api

# Check API logs
docker-compose logs api

# Check if database is ready
docker-compose logs postgres
```

### **If Redis is not accessible:**
```bash
# Check Redis container
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

## 🎯 What You Should See

### **Before (Basic API):**
- Simple console logs
- Basic HTTP responses
- No background processing
- No performance monitoring

### **After (Enhanced API):**
- Structured JSON logs with request IDs
- Comprehensive security headers
- Background job queues in Redis
- Performance monitoring endpoints
- Automated cleanup tasks
- Request ID tracking
- Error handling with proper status codes

## 🚀 Next Steps

1. **Configure environment variables** in `.env` file
2. **Set up Sentry** for error tracking
3. **Configure OpenTelemetry** collector
4. **Run performance tests** with k6
5. **Set up monitoring dashboards**
6. **Deploy to production**

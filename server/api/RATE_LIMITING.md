# Rate Limiting Configuration

This document describes the rate limiting implementation for the Safawinet API, which is **only active in production environments**.

## Overview

Rate limiting is implemented using `@nestjs/throttler` and custom WebSocket rate limiting to protect the API from abuse and ensure fair usage. The rate limiting is **disabled in development and testing environments** to allow for easier development and testing.

## Configuration

### Environment Detection

Rate limiting is only enabled when `NODE_ENV=production`. In all other environments, rate limiting is disabled.

### Rate Limiting Categories

The API implements different rate limits for different types of endpoints:

#### 1. Authentication Endpoints (`auth`)
- **Register**: 5 requests per minute
- **Login**: 10 requests per minute  
- **2FA Login**: 10 requests per minute
- **Forgot Password**: 3 requests per 5 minutes
- **Reset Password**: 5 requests per 5 minutes
- **Email Verification**: 5 requests per 5 minutes

#### 2. User Management Endpoints (`users`)
- **User Creation**: 10 requests per minute (admin only)
- **Profile Updates**: 50 requests per minute
- **Password Changes**: 5 requests per 5 minutes
- **Email Verification**: 5 requests per 5 minutes

#### 3. Loyalty Endpoints (`loyalty`)
- **Account Info**: 30 requests per minute
- **Transaction History**: 30 requests per minute

#### 4. General API Endpoints (`api`)
- **App Controller**: 100 requests per minute
- **Performance Stats**: 20 requests per minute

#### 5. Admin Endpoints
- **Admin Operations**: 100 requests per minute
- **Email Monitoring**: 20 requests per minute

#### 6. Customer Endpoints
- **Customer Operations**: 50 requests per minute

#### 7. Session Management
- **Session Operations**: 30 requests per minute

#### 8. Notifications
- **Notification Operations**: 50 requests per minute

## WebSocket Rate Limiting

WebSocket connections have their own rate limiting system:

- **Connections**: 10 connections per minute per client
- **Messages**: 100 messages per minute per client
- **Authentication**: 5 auth attempts per minute per client

## Implementation Details

### HTTP Rate Limiting

Rate limiting is implemented using:

1. **ThrottlerModule** in `app.module.ts` with environment-based configuration
2. **ThrottlerGuard** applied globally (only in production)
3. **@Throttle** decorators on individual controllers and methods

### WebSocket Rate Limiting

WebSocket rate limiting uses:

1. **WebSocketRateLimitService** for custom rate limiting logic
2. **Redis** for storing rate limit counters
3. **Client ID-based** tracking for WebSocket connections

### Storage

Rate limiting data is stored in Redis with the following key patterns:

- HTTP: `throttler:{throttlerName}:{identifier}`
- WebSocket: `ws:{type}:{clientId}`

## Configuration Files

### Main Configuration
- `server/api/src/app.module.ts` - ThrottlerModule configuration
- `server/api/src/common/services/websocket-rate-limit.service.ts` - WebSocket rate limiting

### Controller Decorators
- `server/api/src/auth/auth.controller.ts` - Auth endpoint limits
- `server/api/src/users/users.controller.ts` - User endpoint limits
- `server/api/src/loyalty/loyalty.controller.ts` - Loyalty endpoint limits
- `server/api/src/websocket/websocket.gateway.ts` - WebSocket limits

## Testing

### Development Testing

In development mode, rate limiting is disabled. You can test the configuration by:

1. Setting `NODE_ENV=production` temporarily
2. Running the test script: `node test-rate-limits.js`
3. Monitoring the logs for rate limit violations

### Production Monitoring

In production, monitor:

1. **Rate limit violations** in application logs
2. **Redis memory usage** for rate limiting data
3. **API response times** to ensure rate limiting doesn't impact performance

## Error Responses

When rate limits are exceeded, the API returns:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

For WebSocket connections, an error event is emitted:

```json
{
  "type": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Please try again later."
}
```

## Customization

### Adjusting Rate Limits

To modify rate limits, update the configuration in `app.module.ts`:

```typescript
throttlers: [
  {
    name: 'auth',
    ttl: 60000, // 1 minute in milliseconds
    limit: 20,  // 20 requests per minute
  },
  // ... other throttlers
]
```

### Adding New Rate Limit Categories

1. Add a new throttler configuration in `app.module.ts`
2. Apply `@Throttle` decorators to the relevant controllers
3. Update this documentation

### WebSocket Rate Limits

Modify the `rateLimits` object in `WebSocketRateLimitService`:

```typescript
private readonly rateLimits = {
  connection: { limit: 10, ttl: 60000 },
  message: { limit: 100, ttl: 60000 },
  auth: { limit: 5, ttl: 60000 },
};
```

## Security Considerations

1. **IP-based limiting**: Consider implementing IP-based rate limiting for additional security
2. **User-based limiting**: Current implementation uses user-based limiting for authenticated endpoints
3. **Burst protection**: Rate limits prevent burst attacks and API abuse
4. **Resource protection**: Protects database and external service resources

## Monitoring and Alerting

Set up monitoring for:

1. **Rate limit violations** - High violation rates may indicate attacks
2. **Redis performance** - Rate limiting relies on Redis performance
3. **API availability** - Ensure rate limiting doesn't block legitimate users
4. **Error rates** - Monitor 429 responses and WebSocket disconnections

## Troubleshooting

### Common Issues

1. **Rate limiting not working**: Check `NODE_ENV` is set to `production`
2. **Redis connection errors**: Ensure Redis is running and accessible
3. **WebSocket disconnections**: Check WebSocket rate limit configuration
4. **False positives**: Adjust rate limits based on legitimate usage patterns

### Debug Mode

To debug rate limiting in development:

1. Temporarily set `NODE_ENV=production`
2. Check Redis keys: `redis-cli keys "throttler:*"`
3. Monitor application logs for rate limit events
4. Use the test script to verify limits

## Future Enhancements

Potential improvements:

1. **Dynamic rate limiting** based on user behavior
2. **IP-based rate limiting** for additional security
3. **Rate limit bypass** for trusted sources
4. **Rate limit analytics** and reporting
5. **Distributed rate limiting** for multi-instance deployments

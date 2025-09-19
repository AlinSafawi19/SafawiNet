# Logging System Documentation

This document describes the comprehensive logging system implemented for both client and server sides of the Safawinet application.

## Overview

The logging system provides:
- **File-based logging** (no database overhead)
- **Structured JSON logs** for easy parsing
- **Automatic log rotation** to prevent disk space issues
- **Client-side error capture** with automatic server transmission
- **Global error handling** for unhandled errors
- **React Error Boundary** for component errors

## Server-Side Logging

### Features
- Winston-based logging with daily rotation
- Separate error logs (kept for 30 days)
- General application logs (kept for 14 days)
- Structured JSON format
- Request context tracking (user ID, request ID, IP, etc.)

### Files Created
- `server/api/src/common/services/logger.service.ts` - Main logging service
- `server/api/src/common/filters/global-exception.filter.ts` - Global error handler
- `server/api/src/api/logs/route.ts` - API endpoint for client logs

### Usage

```typescript
import { LoggerService } from './common/services/logger.service';

// Inject in constructor
constructor(private loggerService: LoggerService) {}

// Log errors
this.loggerService.error('Something went wrong', error, {
  userId: 'user123',
  requestId: 'req456',
  source: 'api',
  metadata: { additional: 'data' }
});

// Log other levels
this.loggerService.warn('Warning message', context);
this.loggerService.info('Info message', context);
this.loggerService.debug('Debug message', context);
```

### Log Files
- `logs/application-YYYY-MM-DD.log` - All application logs
- `logs/errors-YYYY-MM-DD.log` - Error logs only

## Client-Side Logging

### Features
- Automatic error capture (unhandled errors, promise rejections, resource errors)
- React Error Boundary integration
- Queued logging with automatic server transmission
- Development/production mode detection
- User context tracking

### Files Created
- `client/app/services/logger.service.ts` - Client logging service
- `client/app/components/ErrorBoundary/ErrorBoundary.tsx` - React error boundary
- `client/app/hooks/useGlobalErrorHandler.tsx` - Global error handler hook
- `client/app/utils/errorLogger.ts` - Utility functions
- `client/app/components/GlobalErrorHandler.tsx` - Global error handler component

### Usage

```typescript
import { logError, logWarning, logInfo } from '../utils/errorLogger';

// Log errors
logError('Something went wrong', error, {
  component: 'MyComponent',
  action: 'handleClick',
  userId: 'user123',
  metadata: { additional: 'data' }
});

// Log warnings
logWarning('Warning message', {
  component: 'MyComponent',
  action: 'validateInput'
});

// Log info
logInfo('Info message', {
  component: 'MyComponent',
  action: 'dataLoaded'
});
```

## Configuration

### Environment Variables
```bash
# Server
LOG_DIR=./logs                    # Log directory (default: ./logs)
NODE_ENV=production               # Environment (affects log levels)

# Client
NODE_ENV=production               # Environment (affects logging behavior)
```

### Log Levels
- **error**: Critical errors that need immediate attention
- **warning**: Warnings that should be monitored
- **info**: General information about application flow
- **debug**: Detailed debugging information (development only)

## Log Structure

### Server Logs
```json
{
  "timestamp": "2024-01-15 10:30:45.123",
  "level": "error",
  "message": "Database connection failed",
  "service": "safawinet-api",
  "userId": "user123",
  "requestId": "req456",
  "url": "/api/users",
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "192.168.1.1",
  "source": "api",
  "metadata": {
    "additional": "data"
  },
  "stack": "Error: Database connection failed\n    at..."
}
```

### Client Logs
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "error",
  "message": "Component error occurred",
  "url": "https://example.com/page",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "component": "MyComponent",
    "action": "handleClick",
    "userId": "user123",
    "additional": "data"
  },
  "stack": "Error: Component error occurred\n    at..."
}
```

## Monitoring and Analysis

### Log Files Location
- Server: `server/api/logs/`
- Client: Sent to server via API endpoint

### Log Rotation
- **Application logs**: 14 days retention, 20MB max size
- **Error logs**: 30 days retention, 20MB max size
- **Automatic cleanup**: Old logs are automatically removed

### Integration with External Tools
The structured JSON format makes it easy to integrate with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **Datadog**
- **New Relic**
- **Custom log analysis tools**

## Testing the System

Use the `LoggingExample` component to test the logging system:

```tsx
import { LoggingExample } from './components/LoggingExample';

// Add to any page for testing
<LoggingExample />
```

## Best Practices

1. **Use appropriate log levels**:
   - `error`: Only for actual errors that need attention
   - `warning`: For potential issues or deprecated usage
   - `info`: For important application flow events
   - `debug`: For detailed debugging (development only)

2. **Include context**:
   - Always include component/action information
   - Add user ID when available
   - Include relevant metadata

3. **Don't log sensitive data**:
   - Never log passwords, tokens, or personal information
   - Be careful with user input in logs

4. **Use structured logging**:
   - Always use the provided utility functions
   - Include consistent context fields
   - Use meaningful error messages

## Troubleshooting

### Client Logs Not Appearing
1. Check if logging is enabled: `localStorage.getItem('debug-logging')`
2. Check browser console for network errors
3. Verify API endpoint is accessible

### Server Logs Not Appearing
1. Check if `LOG_DIR` directory exists and is writable
2. Verify Winston configuration
3. Check file permissions

### High Log Volume
1. Adjust log levels in production
2. Implement log filtering
3. Consider log sampling for high-volume events

## Security Considerations

1. **Log sanitization**: Sensitive data is filtered out
2. **Access control**: Log files should have restricted access
3. **Retention policies**: Logs are automatically cleaned up
4. **Network security**: Client logs are sent over HTTPS

This logging system provides comprehensive error tracking and monitoring capabilities while maintaining good performance and security practices.

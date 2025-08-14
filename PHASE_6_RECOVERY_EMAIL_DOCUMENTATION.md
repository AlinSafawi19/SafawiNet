# Phase 6: Account Recovery via Recovery Email

## Overview

Phase 6 implements a comprehensive account recovery system that allows users to regain access to their accounts when they lose access to their primary email or 2FA device. This system provides a secure, multi-step recovery process with proper audit trails and security measures.

## Features Implemented

### Feature 11: Request Account Recovery
- **Endpoint**: `POST /v1/auth/recover/request`
- **Purpose**: Initiate account recovery via recovery email
- **Security**: Rate-limited to prevent abuse
- **Privacy**: Does not reveal if recovery email exists

### Feature 12: Confirm Recovery and Stage New Email
- **Endpoint**: `POST /v1/auth/recover/confirm`
- **Purpose**: Confirm recovery token and stage new email address
- **Validation**: Ensures new email is not already in use
- **Security**: Single-use, time-boxed tokens

### Feature 13: Complete Recovery via Email Verification
- **Endpoint**: `POST /v1/auth/verify-email` (reused from Phase 3)
- **Purpose**: Verify new email and complete account recovery
- **Security**: Invalidates all existing sessions
- **Audit**: Logs all recovery actions

## Technical Implementation

### Database Schema Changes

#### New Fields
- **User Model**: Added `recoveryEmail` field (optional, case-insensitive)
- **RecoveryStaging Model**: New table for staging recovery operations

#### RecoveryStaging Table
```sql
CREATE TABLE "recovery_staging" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL UNIQUE,
    "newEmail" TEXT NOT NULL,
    "recoveryTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
```

### Service Architecture

#### RecoveryService
- **requestRecovery()**: Handles initial recovery requests
- **confirmRecovery()**: Confirms recovery and stages new email
- **completeRecovery()**: Completes recovery after email verification
- **cleanupExpiredRecoveries()**: Maintenance function for expired tokens

#### EmailService Integration
- **sendRecoveryEmail()**: Sends recovery tokens to recovery email
- **sendVerificationEmail()**: Sends verification to new email (reused)

### Security Features

#### Token Management
- **Recovery Tokens**: 32-character secure tokens, 30-minute expiration
- **Verification Tokens**: 32-character secure tokens, 30-minute expiration
- **Single-Use**: All tokens are marked as used after consumption
- **Hashing**: Tokens are hashed before storage

#### Rate Limiting
- **Recovery Request**: 3 requests per 5 minutes
- **Recovery Confirmation**: 5 requests per 5 minutes
- **Prevents**: Brute force attacks and email spam

#### Session Invalidation
- **Security Measure**: All existing sessions invalidated after recovery
- **Force Re-authentication**: Users must log in again after recovery
- **Audit Trail**: All recovery actions logged for security monitoring

## API Endpoints

### 1. Request Account Recovery

```http
POST /v1/auth/recover/request
Content-Type: application/json

{
  "recoveryEmail": "recovery@example.com"
}
```

**Response (200)**:
```json
{
  "message": "Recovery token sent to your recovery email. Please check your inbox.",
  "recoveryEmail": "recovery@example.com"
}
```

**Security Features**:
- Rate limited to 3 requests per 5 minutes
- Does not reveal if recovery email exists
- Generates secure recovery token
- Sends email to recovery address

### 2. Confirm Recovery and Stage New Email

```http
POST /v1/auth/recover/confirm
Content-Type: application/json

{
  "token": "recovery_token_from_email",
  "newEmail": "newemail@example.com"
}
```

**Response (200)**:
```json
{
  "message": "Recovery confirmed. Please verify your new email address to complete the process.",
  "newEmail": "newemail@example.com",
  "requiresVerification": true
}
```

**Security Features**:
- Rate limited to 5 requests per 5 minutes
- Validates recovery token
- Checks email availability
- Stages new email for verification

### 3. Complete Recovery (Email Verification)

```http
POST /v1/auth/verify-email
Content-Type: application/json

{
  "token": "verification_token_from_new_email"
}
```

**Response (200)**:
```json
{
  "message": "Account recovery completed successfully. Your email has been updated and all sessions have been invalidated."
}
```

**Security Features**:
- Reuses existing email verification endpoint
- Updates user's primary email
- Invalidates all existing sessions
- Cleans up recovery staging data

## User Flow

### 1. Recovery Request
1. User visits recovery page
2. Enters recovery email address
3. System validates recovery email exists
4. Generates secure recovery token
5. Sends recovery email with token
6. Creates recovery staging record

### 2. Recovery Confirmation
1. User clicks recovery link in email
2. Enters new email address
3. System validates recovery token
4. Checks new email availability
5. Stages new email for verification
6. Sends verification email to new address

### 3. Recovery Completion
1. User clicks verification link in new email
2. System validates verification token
3. Updates user's primary email
4. Invalidates all existing sessions
5. Cleans up recovery staging data
6. User must log in again with new email

## Security Considerations

### Privacy Protection
- **No Information Disclosure**: Recovery requests don't reveal if email exists
- **Generic Messages**: All responses use generic language
- **Rate Limiting**: Prevents email enumeration attacks

### Token Security
- **Secure Generation**: Uses cryptographically secure random tokens
- **Time Boxing**: All tokens expire after 30 minutes
- **Single Use**: Tokens cannot be reused
- **Hashing**: Tokens are hashed before storage

### Session Security
- **Complete Invalidation**: All sessions invalidated after recovery
- **Force Re-authentication**: Users must prove identity again
- **Audit Logging**: All recovery actions logged

### Email Security
- **Recovery Email**: Must match exactly (case-insensitive)
- **New Email Validation**: Prevents email hijacking
- **Verification Required**: New email must be verified

## Testing

### Unit Tests
- **RecoveryService**: Comprehensive test coverage for all methods
- **Edge Cases**: Invalid tokens, expired tokens, email conflicts
- **Security**: Token validation, rate limiting, session invalidation

### Integration Tests
- **End-to-End Flow**: Complete recovery process
- **Database Operations**: Proper data persistence and cleanup
- **Email Delivery**: Recovery and verification emails

### Security Tests
- **Rate Limiting**: Verify abuse prevention
- **Token Expiration**: Ensure expired tokens are rejected
- **Session Invalidation**: Confirm all sessions are invalidated

## Configuration

### Environment Variables
```env
# Email Configuration
MAIL_HOST=localhost
MAIL_PORT=1025
FRONTEND_URL=http://localhost:3000

# Security Configuration
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

### Rate Limiting
```typescript
// Recovery request: 3 per 5 minutes
@Throttle({ default: { limit: 3, ttl: 300000 } })

// Recovery confirmation: 5 per 5 minutes  
@Throttle({ default: { limit: 5, ttl: 300000 } })
```

## Maintenance

### Cleanup Jobs
- **Expired Recoveries**: Automatic cleanup of expired staging records
- **Token Cleanup**: Remove expired verification tokens
- **Audit Logs**: Archive old recovery logs

### Monitoring
- **Recovery Attempts**: Track success/failure rates
- **Email Delivery**: Monitor email service health
- **Security Events**: Alert on suspicious recovery patterns

## Future Enhancements

### Potential Improvements
1. **Recovery Email Management**: Allow users to update recovery email
2. **Multi-Factor Recovery**: Additional verification methods
3. **Recovery History**: User-visible recovery attempt history
4. **Advanced Rate Limiting**: IP-based and user-based limits
5. **Recovery Notifications**: Alert users of recovery attempts

### Security Enhancements
1. **Device Fingerprinting**: Track recovery from new devices
2. **Geographic Restrictions**: Limit recovery to known locations
3. **Time-Based Restrictions**: Limit recovery to certain hours
4. **Admin Approval**: Require admin approval for certain recoveries

## Conclusion

Phase 6 successfully implements a robust, secure account recovery system that provides users with a reliable way to regain access to their accounts while maintaining strict security standards. The system includes comprehensive audit trails, rate limiting, and session invalidation to prevent abuse and ensure account security.

The implementation follows security best practices and provides a seamless user experience while maintaining the highest standards of account protection. All recovery actions are logged and monitored, providing administrators with visibility into account recovery activities.

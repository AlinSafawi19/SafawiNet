# Phase 7: Account & Preferences Management

## Overview

Phase 7 implements comprehensive account and preferences management features that allow authenticated users to manage their profile information, UI preferences, notification settings, and security credentials. This phase provides a secure, user-friendly interface for users to customize their experience while maintaining strict security standards.

## Features Implemented

### Feature 14: Profile Management
- **Endpoint**: `PATCH /v1/users/me`
- **Purpose**: Update user profile information (firstName, lastName, recoveryEmail)
- **Security**: Requires valid access token, strong input validation
- **Privacy**: Only allowed fields are mutable

### Feature 15: Preferences & Settings Management
- **Endpoint**: `PUT /v1/users/me/preferences`
- **Purpose**: Manage UI settings and application preferences
- **Endpoint**: `PUT /v1/users/me/notification-preferences`
- **Purpose**: Configure notification preferences across multiple channels

### Feature 16: Email Change Management
- **Endpoint**: `PATCH /v1/users/me/email`
- **Purpose**: Initiate email change flow with confirmation
- **Security**: Requires email verification, revokes refresh tokens

### Feature 17: Password Change Management
- **Endpoint**: `PATCH /v1/users/me/password`
- **Purpose**: Change password with current password verification
- **Security**: Notifies by email, revokes all refresh tokens

### Feature 18: User Profile Retrieval
- **Endpoint**: `GET /v1/users/me`
- **Purpose**: Retrieve current user profile and preferences
- **Security**: Requires valid access token

## Technical Implementation

### Database Schema

#### User Model Fields
The User model already includes all necessary fields for account management:

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique @db.Citext
  recoveryEmail String? @db.Citext
  password    String
  name        String?
  isVerified  Boolean  @default(false)
  twoFactorEnabled Boolean @default(false)
  preferences Json?    // UI settings and preferences
  notificationPreferences Json? // Notification preferences
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  pendingEmailChanges PendingEmailChange[]
  refreshSessions RefreshSession[]
  // ... other relations
}
```

#### PendingEmailChange Model
```prisma
model PendingEmailChange {
  id            String   @id @default(cuid())
  userId        String
  newEmail      String   @db.Citext
  changeTokenHash String
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  
  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("pending_email_changes")
  @@index([expiresAt])
  @@index([changeTokenHash])
}
```

### Service Architecture

#### UsersService
- **getCurrentUser()**: Retrieves current user profile
- **updateProfile()**: Updates user profile information
- **updatePreferences()**: Updates UI preferences
- **updateNotificationPreferences()**: Updates notification settings
- **changeEmail()**: Initiates email change process
- **confirmEmailChange()**: Confirms email change with token
- **changePassword()**: Changes user password
- **revokeRefreshTokens()**: Revokes all active sessions

#### EmailService Integration
- **sendEmailChangeConfirmationEmail()**: Sends confirmation to new email
- **sendPasswordChangeNotificationEmail()**: Notifies of password change

### Security Features

#### Authentication & Authorization
- **JWT Guard**: All endpoints require valid access token
- **User Context**: Users can only modify their own data
- **Token Validation**: Secure token generation and validation

#### Input Validation
- **Zod Schemas**: Strong type validation for all inputs
- **Field Restrictions**: Only allowed fields are mutable
- **Email Validation**: Proper email format validation
- **Password Strength**: Minimum 8 character requirement

#### Session Security
- **Token Revocation**: All refresh tokens revoked on password/email change
- **Force Re-authentication**: Users must log in again after security changes
- **Audit Trail**: All changes logged for security monitoring

## API Endpoints

### 1. Get Current User Profile

```http
GET /v1/users/me
Authorization: Bearer <access_token>
```

**Response (200)**:
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "recoveryEmail": "recovery@example.com",
    "isVerified": true,
    "twoFactorEnabled": false,
    "preferences": {
      "theme": "dark",
      "language": "en",
      "timezone": "America/New_York",
      "dateFormat": "MM/DD/YYYY",
      "timeFormat": "12h",
      "notifications": {
        "sound": true,
        "desktop": true
      }
    },
    "notificationPreferences": {
      "email": {
        "marketing": false,
        "security": true,
        "updates": true,
        "weeklyDigest": false
      },
      "push": {
        "enabled": true,
        "marketing": false,
        "security": true,
        "updates": true
      },
      "sms": {
        "enabled": false,
        "security": true,
        "twoFactor": true
      }
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Security Features**:
- Requires valid JWT access token
- Rate limited to 100 requests per minute
- Returns user data without sensitive information

### 2. Update User Profile

```http
PATCH /v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "John Smith",
  "recoveryEmail": "john.recovery@example.com"
}
```

**Response (200)**:
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Smith",
    "recoveryEmail": "john.recovery@example.com",
    // ... other fields
  }
}
```

**Security Features**:
- Rate limited to 10 requests per 5 minutes
- Only allows updating specific fields
- Validates email format for recovery email
- Checks for email conflicts

### 3. Update User Preferences

```http
PUT /v1/users/me/preferences
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "theme": "dark",
  "language": "es",
  "timezone": "America/New_York",
  "dateFormat": "DD/MM/YYYY",
  "timeFormat": "24h",
  "notifications": {
    "sound": false,
    "desktop": false
  }
}
```

**Response (200)**:
```json
{
  "message": "Preferences updated successfully",
  "user": {
    "id": "user_id",
    "preferences": {
      "theme": "dark",
      "language": "es",
      "timezone": "America/New_York",
      "dateFormat": "DD/MM/YYYY",
      "timeFormat": "24h",
      "notifications": {
        "sound": false,
        "desktop": false
      }
    }
    // ... other fields
  }
}
```

**Security Features**:
- Rate limited to 20 requests per 5 minutes
- Validates preference values (enum validation)
- Merges with existing preferences
- Maintains data integrity

### 4. Update Notification Preferences

```http
PUT /v1/users/me/notification-preferences
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": {
    "marketing": true,
    "security": false,
    "updates": true,
    "weeklyDigest": false
  },
  "push": {
    "enabled": false,
    "marketing": true,
    "security": false,
    "updates": false
  },
  "sms": {
    "enabled": true,
    "security": false,
    "twoFactor": false
  }
}
```

**Response (200)**:
```json
{
  "message": "Notification preferences updated successfully",
  "user": {
    "id": "user_id",
    "notificationPreferences": {
      "email": {
        "marketing": true,
        "security": false,
        "updates": true,
        "weeklyDigest": false
      },
      "push": {
        "enabled": false,
        "marketing": true,
        "security": false,
        "updates": false
      },
      "sms": {
        "enabled": true,
        "security": false,
        "twoFactor": false
      }
    }
    // ... other fields
  }
}
```

**Security Features**:
- Rate limited to 20 requests per 5 minutes
- Granular control over notification channels
- Boolean validation for all preference flags
- Maintains existing preferences structure

### 5. Request Email Change

```http
PATCH /v1/users/me/email
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "newEmail": "newemail@example.com"
}
```

**Response (200)**:
```json
{
  "message": "Email change confirmation sent to new email address"
}
```

**Security Features**:
- Rate limited to 5 requests per hour
- Validates new email format
- Checks email availability
- Creates pending change record
- Sends confirmation email

### 6. Confirm Email Change

```http
POST /v1/users/confirm-email-change
Content-Type: application/json

{
  "token": "email_change_confirmation_token"
}
```

**Response (200)**:
```json
{
  "message": "Email changed successfully. Please sign in with your new email address."
}
```

**Security Features**:
- Rate limited to 5 requests per hour
- Validates confirmation token
- Checks token expiration
- Updates user email
- Revokes all refresh tokens
- Cleans up pending change

### 7. Change Password

```http
PATCH /v1/users/me/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "currentPassword123",
  "newPassword": "newSecurePassword123",
  "confirmNewPassword": "newSecurePassword123"
}
```

**Response (200)**:
```json
{
  "message": "Password changed successfully"
}
```

**Security Features**:
- Rate limited to 5 requests per hour
- Verifies current password
- Validates new password strength
- Updates password hash
- Revokes all refresh tokens
- Sends notification email

## User Flow

### 1. Profile Management
1. User authenticates with valid JWT token
2. User requests profile update with new information
3. System validates input data and field restrictions
4. System updates user profile in database
5. System returns updated user information
6. Changes are immediately reflected in GET /me

### 2. Preferences Management
1. User authenticates with valid JWT token
2. User submits preference updates
3. System validates preference values
4. System merges new preferences with existing ones
5. System persists updated preferences
6. Changes are immediately reflected in GET /me

### 3. Email Change Flow
1. User authenticates and requests email change
2. System validates new email format and availability
3. System creates pending email change record
4. System sends confirmation email to new address
5. User clicks confirmation link in email
6. System validates confirmation token
7. System updates user email and revokes sessions
8. User must log in again with new email

### 4. Password Change Flow
1. User authenticates and requests password change
2. System verifies current password
3. System validates new password strength
4. System hashes and stores new password
5. System revokes all refresh tokens
6. System sends notification email
7. User must log in again with new password

## Security Considerations

### Authentication & Authorization
- **JWT Validation**: All endpoints require valid access tokens
- **User Isolation**: Users can only access their own data
- **Token Expiration**: Access tokens expire after 15 minutes
- **Refresh Token Rotation**: Secure refresh token handling

### Input Validation
- **Schema Validation**: Zod schemas ensure data integrity
- **Field Restrictions**: Only specific fields are mutable
- **Email Validation**: Proper email format and availability checks
- **Password Strength**: Minimum 8 character requirement

### Session Security
- **Token Revocation**: All sessions invalidated on security changes
- **Force Re-authentication**: Users must prove identity after changes
- **Audit Logging**: All changes logged for security monitoring
- **Rate Limiting**: Prevents abuse and brute force attacks

### Data Privacy
- **Field Masking**: Sensitive fields never returned in responses
- **Selective Updates**: Only allowed fields can be modified
- **Conflict Prevention**: Prevents email conflicts and data corruption
- **Secure Storage**: All sensitive data properly hashed

## Testing

### Unit Tests
- **UsersService**: Comprehensive test coverage for all methods
- **Input Validation**: Zod schema validation testing
- **Security Functions**: Password hashing and verification
- **Error Handling**: Proper exception handling and error messages

### Integration Tests
- **End-to-End Flows**: Complete user management workflows
- **Database Operations**: Proper data persistence and cleanup
- **Email Delivery**: Confirmation and notification emails
- **Session Management**: Token revocation and re-authentication

### Security Tests
- **Rate Limiting**: Verify abuse prevention mechanisms
- **Authentication**: Ensure unauthorized access is blocked
- **Input Validation**: Test malicious input handling
- **Session Security**: Verify token revocation on changes

### Acceptance Tests
All updates require valid access token:
- ✅ GET /v1/users/me - Requires authentication
- ✅ PATCH /v1/users/me - Requires authentication
- ✅ PUT /v1/users/me/preferences - Requires authentication
- ✅ PUT /v1/users/me/notification-preferences - Requires authentication
- ✅ PATCH /v1/users/me/email - Requires authentication
- ✅ PATCH /v1/users/me/password - Requires authentication

Change email/password flows send the right emails and enforce confirmation:
- ✅ Email change sends confirmation to new email
- ✅ Password change sends notification to current email
- ✅ Email change requires token confirmation
- ✅ All security changes revoke refresh tokens

Preferences persisted and reflected in GET /me:
- ✅ UI preferences stored in database
- ✅ Notification preferences stored in database
- ✅ All preferences returned in GET /me response
- ✅ Changes immediately reflected in profile

## Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration
MAIL_HOST=localhost
MAIL_PORT=1025
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_TTL=300000
RATE_LIMIT_LIMIT=10
```

### Rate Limiting Configuration
```typescript
// Profile updates: 10 per 5 minutes
@RateLimit({ limit: 10, windowSeconds: 300, keyPrefix: 'update_profile' })

// Preferences: 20 per 5 minutes
@RateLimit({ limit: 20, windowSeconds: 300, keyPrefix: 'update_preferences' })

// Email changes: 5 per hour
@RateLimit({ limit: 5, windowSeconds: 3600, keyPrefix: 'change_email' })

// Password changes: 5 per hour
@RateLimit({ limit: 5, windowSeconds: 3600, keyPrefix: 'change_password' })
```

## Maintenance

### Cleanup Jobs
- **Expired Email Changes**: Automatic cleanup of expired pending changes
- **Token Cleanup**: Remove expired verification tokens
- **Audit Logs**: Archive old change logs
- **Session Cleanup**: Remove inactive refresh sessions

### Monitoring
- **Profile Updates**: Track success/failure rates
- **Email Changes**: Monitor email change success rates
- **Password Changes**: Track password change patterns
- **Security Events**: Alert on suspicious account changes

## Future Enhancements

### Potential Improvements
1. **Profile Picture Management**: Upload and manage profile images
2. **Address Information**: Store and manage user addresses
3. **Social Media Links**: Connect social media accounts
4. **Account Deletion**: Self-service account deletion
5. **Data Export**: Export user data in various formats

### Security Enhancements
1. **Change History**: Track and display account change history
2. **Device Management**: Manage active sessions and devices
3. **Login Notifications**: Alert on login from new devices
4. **Advanced Preferences**: More granular preference controls
5. **Privacy Controls**: Enhanced privacy and data sharing options

## Conclusion

Phase 7 successfully implements a comprehensive, secure account and preferences management system that provides users with full control over their profile information, UI settings, and notification preferences while maintaining the highest security standards. The system includes robust input validation, rate limiting, session management, and audit trails to ensure data integrity and prevent abuse.

All required endpoints are fully implemented with proper authentication, authorization, and security measures. The system provides a seamless user experience for managing account settings while maintaining strict security controls and comprehensive testing coverage. Users can confidently manage their accounts knowing that all changes are properly validated, secured, and audited.

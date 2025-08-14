# Phase 5: 2FA (TOTP) Full Flow Documentation

## Overview

Phase 5 implements a complete Two-Factor Authentication (2FA) system using Time-based One-Time Password (TOTP) with backup codes for account recovery. This provides an additional layer of security beyond username and password authentication.

## Features Implemented

### Feature 8: 2FA Setup
- Generate TOTP secret and QR code
- Create 10 backup codes for account recovery
- Store encrypted secret and hashed backup codes

### Feature 9: 2FA Enable/Disable
- Enable 2FA with TOTP verification
- Disable 2FA with TOTP or backup code
- Secure cleanup of 2FA data

### Feature 10: 2FA Login Flow
- Modified login flow to require 2FA code
- Support for both TOTP and backup codes
- One-time use backup codes

## Database Schema Changes

### New Tables

#### `two_factor_secrets`
```sql
CREATE TABLE two_factor_secrets (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  secret TEXT NOT NULL, -- encrypted TOTP secret
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### `backup_codes`
```sql
CREATE TABLE backup_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL, -- hashed backup code
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_backup_codes_user_used ON backup_codes(user_id, is_used);
```

### Updated Tables

#### `users`
```sql
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
```

## API Endpoints

### POST /v1/auth/2fa/setup
**Authentication Required**: Yes (JWT)

Sets up 2FA for the authenticated user.

**Request Body**: Empty

**Response**:
```json
{
  "secret": "JBSWY3DPEHPK3PXP", // TOTP secret (display once)
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...", // QR code data URL
  "otpauthUrl": "otpauth://totp/SafaWinet:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SafaWinet",
  "backupCodes": ["ABC12345", "DEF67890", ...] // 10 backup codes (display once)
}
```

### POST /v1/auth/2fa/enable
**Authentication Required**: Yes (JWT)

Enables 2FA after verifying the TOTP code.

**Request Body**:
```json
{
  "code": "123456" // 6-digit TOTP code
}
```

**Response**:
```json
{
  "message": "Two-factor authentication enabled successfully"
}
```

### POST /v1/auth/2fa/disable
**Authentication Required**: Yes (JWT)

Disables 2FA using TOTP or backup code.

**Request Body**:
```json
{
  "code": "123456" // TOTP code or backup code
}
```

**Response**:
```json
{
  "message": "Two-factor authentication disabled successfully"
}
```

### POST /v1/auth/2fa/login
**Authentication Required**: No

Completes login for users with 2FA enabled.

**Request Body**:
```json
{
  "userId": "user_id_from_previous_login",
  "code": "123456" // TOTP code or backup code
}
```

**Response**:
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 900
  },
  "user": {
    "id": "user_id",
    "email": "test@example.com",
    "name": "Test User",
    "isVerified": true,
    "twoFactorEnabled": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Modified Login Flow

### Standard Login (No 2FA)
```json
POST /v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "tokens": { ... },
  "user": { ... }
}
```

### Login with 2FA Enabled
```json
POST /v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "requiresTwoFactor": true,
  "user": { ... }
}

Then:
POST /v1/auth/2fa/login
{
  "userId": "user_id",
  "code": "123456"
}

Response:
{
  "tokens": { ... },
  "user": { ... }
}
```

## Security Features

### TOTP Implementation
- Uses `speakeasy` library for TOTP generation and verification
- 30-second time windows with 1-step clock skew tolerance
- Base32 encoded secrets for compatibility with authenticator apps

### Secret Encryption
- TOTP secrets are encrypted using AES-256-CBC before storage
- Encryption key derived from environment variable `ENCRYPTION_KEY`
- IV (Initialization Vector) stored with encrypted data

### Backup Codes
- 10 randomly generated 8-character alphanumeric codes
- Codes are hashed using SHA-256 before storage
- One-time use: marked as used when consumed
- Can be used for both login and 2FA disable

### Rate Limiting
- 2FA setup: No specific limit (requires authentication)
- 2FA enable/disable: No specific limit (requires authentication)
- 2FA login: 10 requests per minute

## Implementation Details

### TwoFactorService
The core service handling all 2FA operations:

- `setupTwoFactor()`: Generates secret, QR code, and backup codes
- `enableTwoFactor()`: Verifies TOTP and enables 2FA
- `disableTwoFactor()`: Verifies code and disables 2FA
- `validateTwoFactorCode()`: Validates TOTP or backup codes

### SecurityUtils Enhancements
Added encryption/decryption methods:
- `encryptData()`: Encrypts data using AES-256-CBC
- `decryptData()`: Decrypts data using AES-256-CBC
- `verifyToken()`: Verifies token against hash

### Database Transactions
Critical operations use database transactions to ensure data consistency:
- 2FA setup: Creates secret and backup codes atomically
- 2FA disable: Updates user and cleans up data atomically

## Testing

### Unit Tests
- `two-factor.service.spec.ts`: Comprehensive unit tests for TwoFactorService
- Tests cover all success and error scenarios
- Mocked external dependencies (speakeasy, QR code generation)

### End-to-End Tests
- `2fa.e2e-spec.ts`: Full integration tests
- Tests complete 2FA flows from setup to login
- Verifies database state changes
- Tests backup code consumption

### Test Coverage
- ✅ 2FA setup flow
- ✅ 2FA enable with TOTP
- ✅ 2FA disable with TOTP
- ✅ 2FA disable with backup code
- ✅ 2FA login with TOTP
- ✅ 2FA login with backup code
- ✅ Backup code one-time use
- ✅ Error handling for invalid codes
- ✅ Authentication requirements

## Usage Examples

### Setting up 2FA
1. User logs in and calls `/v1/auth/2fa/setup`
2. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
3. User enters TOTP code and calls `/v1/auth/2fa/enable`
4. User stores backup codes securely

### Logging in with 2FA
1. User enters email/password
2. If 2FA enabled, login returns `requiresTwoFactor: true`
3. User enters TOTP code from authenticator app
4. User calls `/v1/auth/2fa/login` with code
5. User receives access tokens

### Using Backup Codes
- Can be used instead of TOTP for login or 2FA disable
- Each code can only be used once
- Used codes are marked with `isUsed: true` and `usedAt` timestamp

## Environment Variables

```env
# Required for secret encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Optional: App name for TOTP issuer
APP_NAME=SafaWinet
```

## Dependencies Added

```json
{
  "speakeasy": "^2.0.0", // TOTP generation and verification
  "qrcode": "^1.5.3"     // QR code generation
}
```

## Security Considerations

1. **Secret Storage**: TOTP secrets are encrypted before database storage
2. **Backup Codes**: Hashed using SHA-256, one-time use only
3. **Rate Limiting**: Prevents brute force attacks on 2FA codes
4. **Clock Skew**: TOTP verification allows 1 time step tolerance
5. **Cleanup**: 2FA data is completely removed when disabled
6. **Session Management**: 2FA login creates new sessions

## Future Enhancements

1. **KMS Integration**: Replace local encryption with AWS KMS or similar
2. **Multiple 2FA Methods**: Support for SMS, email, or hardware tokens
3. **2FA Recovery**: Admin-assisted account recovery process
4. **Device Management**: Track and manage trusted devices
5. **2FA Analytics**: Monitor 2FA usage and security events

## Migration Notes

The database migration `20250814194843_add_2fa_support` adds:
- `two_factor_enabled` column to users table
- `two_factor_secrets` table
- `backup_codes` table with indexes

No data migration is required as 2FA is opt-in for users.

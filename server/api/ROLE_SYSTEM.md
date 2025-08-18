# Role-Based Access Control (RBAC) System

## Overview

The SafaWiNet application now implements a comprehensive role-based access control system that differentiates between different types of users and their permissions.

## User Roles

### 1. CUSTOMER
- **Default role** for all registered users
- Can access customer-specific features
- Can manage their own profile and preferences
- Can view their loyalty account and transactions
- Can create support tickets
- Can manage their own sessions and security settings

### 2. ADMIN
- **Highest privilege level**
- Can access all system features
- Can manage all users (view, update roles, delete)
- Can view system statistics and monitoring data
- Can manage all sessions across the platform
- Can broadcast notifications to users
- Can access email monitoring and system health data

### 3. MODERATOR
- **Intermediate privilege level**
- Can moderate user content and activities
- Can view user data (limited scope)
- Can manage support tickets
- Can access some administrative features

### 4. SUPPORT
- **Customer support role**
- Can view customer information
- Can manage support tickets
- Can access customer-specific data for support purposes

## Implementation Details

### Database Schema

The role system is implemented using a PostgreSQL enum and array field:

```sql
-- Role enum
enum Role {
  CUSTOMER
  ADMIN
  MODERATOR
  SUPPORT
}

-- User model with roles
model User {
  id          String   @id @default(cuid())
  email       String   @unique @db.Citext
  roles       Role[]   @default([CUSTOMER]) // Multiple roles per user
  // ... other fields
}
```

### JWT Token Integration

User roles are included in JWT tokens for efficient authorization:

```typescript
// JWT payload includes roles
const payload = {
  sub: user.id,
  email: user.email,
  verified: user.isVerified,
  roles: user.roles, // Array of user roles
};
```

### Guards and Decorators

#### RolesGuard
- Validates user permissions based on required roles
- Can be applied at controller or method level
- Throws `ForbiddenException` for insufficient permissions

#### @Roles Decorator
- Specifies required roles for endpoints
- Supports multiple roles (OR logic)
- Can be applied to controllers or individual methods

### Usage Examples

#### Controller-level role protection:
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  // All methods require ADMIN role
}
```

#### Method-level role protection:
```typescript
@Controller('mixed')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MixedController {
  @Get('admin-only')
  @Roles(Role.ADMIN)
  adminOnlyMethod() {
    // Only admins can access
  }

  @Get('customer-or-admin')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  customerOrAdminMethod() {
    // Both customers and admins can access
  }
}
```

## API Endpoints

### Admin Endpoints (`/admin`)
- `GET /admin/users` - List all users with pagination
- `GET /admin/users/:id` - Get detailed user information
- `PUT /admin/users/:id/roles` - Update user roles
- `DELETE /admin/users/:id` - Delete user
- `GET /admin/system/stats` - System statistics
- `GET /admin/system/email-monitoring` - Email monitoring data
- `GET /admin/sessions` - List all user sessions
- `DELETE /admin/sessions/:sessionId` - Revoke session
- `POST /admin/notifications/broadcast` - Broadcast notifications

### Customer Endpoints (`/customer`)
- `GET /customer/profile` - Get customer profile
- `PUT /customer/profile` - Update customer profile
- `GET /customer/loyalty` - Get loyalty account
- `GET /customer/loyalty/transactions` - Get loyalty transactions
- `POST /customer/support/ticket` - Create support ticket
- `GET /customer/security/status` - Get security status
- `GET /customer/activity` - Get account activity
- `PUT /customer/notifications/:id/read` - Mark notification as read

### Protected Endpoints
- `GET /v1/email-monitoring/*` - Admin only
- `GET /v1/sessions/*` - All authenticated users (role-based filtering)

## Security Features

### Role Validation
- Server-side validation of user roles
- JWT token includes current user roles
- Automatic role checking on protected endpoints

### Self-Protection
- Admins cannot remove their own admin role
- Admins cannot delete their own account
- Role changes are logged for audit purposes

### Session Management
- Role-based session access
- Admins can view and manage all sessions
- Customers can only manage their own sessions

## Test Accounts

After running the seed script, the following test accounts are available:

### Admin Account
- **Email**: `admin@safawinet.com`
- **Password**: `admin123456`
- **Roles**: `ADMIN`, `CUSTOMER`
- **Access**: All features

### Customer Account
- **Email**: `user@safawinet.com`
- **Password**: `user123456`
- **Roles**: `CUSTOMER`
- **Access**: Customer features only

### Moderator Account
- **Email**: `developer@safawinet.com`
- **Password**: `dev123456`
- **Roles**: `MODERATOR`, `CUSTOMER`
- **Access**: Moderator + Customer features

## Migration and Setup

### 1. Run Database Migration
```bash
cd server/api
npx prisma migrate dev --name add_user_roles
```

### 2. Update Prisma Client
```bash
npx prisma generate
```

### 3. Seed Database with Test Users
```bash
npx prisma db seed
```

## Best Practices

### 1. Role Assignment
- Always assign the `CUSTOMER` role to new users
- Use multiple roles sparingly
- Regularly audit role assignments

### 2. Security
- Never expose role information in client-side code
- Always validate roles on the server side
- Log all role changes for audit purposes

### 3. API Design
- Use descriptive endpoint names
- Group endpoints by role requirements
- Provide clear error messages for permission denied

### 4. Testing
- Test all role combinations
- Verify role inheritance works correctly
- Test edge cases (self-modification, etc.)

## Future Enhancements

### Planned Features
1. **Role Hierarchy**: Implement role inheritance
2. **Permission Granularity**: Fine-grained permissions within roles
3. **Role Templates**: Predefined role sets for common use cases
4. **Audit Trail**: Comprehensive logging of role changes
5. **Role Expiration**: Temporary role assignments
6. **Multi-tenancy**: Role support for different organizations

### Integration Points
1. **Order Management**: Role-based order access
2. **Inventory Management**: Admin-only inventory operations
3. **Analytics**: Role-based data access
4. **Reporting**: Role-specific report generation
5. **API Rate Limiting**: Role-based rate limits

## Troubleshooting

### Common Issues

1. **Role not found in JWT**
   - Ensure user has roles assigned in database
   - Check JWT token generation includes roles
   - Verify JWT strategy returns roles

2. **Permission denied errors**
   - Check user has required roles
   - Verify endpoint has correct @Roles decorator
   - Ensure RolesGuard is applied

3. **Role changes not taking effect**
   - JWT tokens need to be refreshed after role changes
   - Check database for role updates
   - Verify migration was applied correctly

### Debug Commands

```bash
# Check user roles in database
npx prisma studio

# Verify JWT token contents
# Use jwt.io to decode tokens

# Check role assignments
SELECT id, email, roles FROM users;
```

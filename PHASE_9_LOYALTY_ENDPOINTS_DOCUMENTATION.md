# Phase 9: Loyalty Endpoints Documentation

## Overview

Phase 9 implements the core loyalty system endpoints for the Safa Wine application. This phase focuses on exposing current tier information and transaction history while maintaining a read-only approach to point mutations, which will be handled by the future Order service.

## Implemented Endpoints

### 1. GET /v1/loyalty/me

**Purpose**: Retrieve current user's loyalty account information including tier, balances, and progress.

**Authentication**: Required (JWT Bearer token)

**Response Structure**:
```json
{
  "id": "loyalty-account-id",
  "currentTier": {
    "id": "tier-id",
    "name": "Silver",
    "minPoints": 1000,
    "maxPoints": 4999,
    "benefits": {
      "discount": 0.10,
      "freeShipping": true
    },
    "color": "#C0C0C0",
    "icon": "🥈"
  },
  "currentPoints": 2500,
  "lifetimePoints": 3500,
  "tierUpgradedAt": "2024-01-01T00:00:00.000Z",
  "nextTier": {
    "name": "Gold",
    "minPoints": 5000,
    "pointsNeeded": 2500
  }
}
```

**Features**:
- Current tier information with benefits
- Current and lifetime point balances
- Next tier progress information
- Tier upgrade timestamp

### 2. GET /v1/loyalty/transactions

**Purpose**: Retrieve paginated transaction history for the authenticated user.

**Authentication**: Required (JWT Bearer token)

**Query Parameters**:
- `cursor` (optional): Pagination cursor for next page
- `limit` (optional): Number of transactions to return (default: 20, max: 100)

**Response Structure**:
```json
{
  "transactions": [
    {
      "id": "transaction-id",
      "type": "earn",
      "points": 100,
      "description": "Purchase bonus points",
      "metadata": { "source": "purchase" },
      "orderId": "order-123",
      "expiresAt": "2025-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "hasNext": true,
    "hasPrevious": false,
    "nextCursor": "next-cursor-id",
    "previousCursor": null
  }
}
```

**Features**:
- Cursor-based pagination for efficient navigation
- Configurable page size (1-100 items)
- Transaction metadata and expiration information
- Order reference for future integration

## Database Schema

### LoyaltyTier Model
```prisma
model LoyaltyTier {
  id          String   @id @default(cuid())
  name        String   @unique // Bronze, Silver, Gold, Platinum, Diamond
  minPoints   Int      @unique // Minimum points required
  maxPoints   Int?     // Maximum points (null for highest tier)
  benefits    Json?    // Tier benefits as JSON
  color       String?  // Hex color for UI
  icon        String?  // Icon identifier
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  loyaltyAccounts LoyaltyAccount[]
  
  @@map("loyalty_tiers")
  @@index([minPoints])
}
```

### LoyaltyAccount Model
```prisma
model LoyaltyAccount {
  id          String   @id @default(cuid())
  userId      String   @unique
  currentTierId String
  currentPoints Int    @default(0)
  lifetimePoints Int   @default(0)
  tierUpgradedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  currentTier LoyaltyTier @relation(fields: [currentTierId], references: [id])
  transactions LoyaltyTransaction[]

  @@map("loyalty_accounts")
  @@index([currentPoints])
  @@index([currentTierId])
}
```

### LoyaltyTransaction Model
```prisma
model LoyaltyTransaction {
  id          String   @id @default(cuid())
  loyaltyAccountId String
  type        String   // earn, spend, expire, adjustment
  points      Int      // Positive for earn, negative for spend
  description String
  metadata    Json?    // Additional transaction details
  orderId     String?  // Future reference to order service
  expiresAt   DateTime? // When points expire
  createdAt   DateTime @default(now())

  loyaltyAccount LoyaltyAccount @relation(fields: [loyaltyAccountId], references: [id], onDelete: Cascade)

  @@map("loyalty_transactions")
  @@index([loyaltyAccountId, createdAt])
  @@index([type, createdAt])
  @@index([expiresAt])
}
```

## Architecture

### Module Structure
```
src/loyalty/
├── loyalty.module.ts      # Module configuration
├── loyalty.controller.ts   # HTTP endpoints
├── loyalty.service.ts      # Business logic
├── loyalty.service.spec.ts # Unit tests
└── loyalty.controller.spec.ts # Controller tests
```

### Dependencies
- **JwtModule**: For JWT authentication support
- **ConfigModule**: For environment configuration
- **PrismaService**: For database operations
- **JwtAuthGuard**: For endpoint protection

### Service Layer
The `LoyaltyService` provides:
- `getUserLoyaltyAccount()`: Retrieves user loyalty information with tier details
- `getUserTransactions()`: Handles paginated transaction retrieval

### Controller Layer
The `LoyaltyController` handles:
- Request validation and parsing
- Authentication enforcement
- Response formatting
- Swagger documentation

## Testing Strategy

### Unit Tests
- **LoyaltyService**: Tests business logic, error handling, and data transformation
- **LoyaltyController**: Tests HTTP layer, parameter handling, and service integration

### End-to-End Tests
- **Authentication**: Verifies JWT protection on all endpoints
- **Data Retrieval**: Tests correct tier and balance information
- **Pagination**: Validates cursor-based pagination functionality
- **Edge Cases**: Handles invalid cursors, limits, and missing data

### Test Data
The test suite creates:
- Test users with verified accounts
- Loyalty tiers (Bronze, Silver, Gold, Platinum, Diamond)
- Sample loyalty accounts with realistic point balances
- Transaction history for pagination testing

## Performance Considerations

### Database Indexing
- `loyaltyAccountId + createdAt`: Optimizes transaction queries
- `currentPoints`: Supports tier-based queries
- `currentTierId`: Accelerates tier lookups
- `type + createdAt`: Enables transaction type filtering

### Pagination Strategy
- Cursor-based pagination for consistent performance
- Configurable page sizes (1-100 items)
- Efficient skip/cursor operations
- No offset-based pagination to avoid performance degradation

### Query Optimization
- Selective field retrieval where possible
- Proper relationship loading with `include`
- Indexed sorting on `createdAt` field

## Security Features

### Authentication
- JWT Bearer token required for all endpoints
- User context validation in service layer
- Proper error handling for unauthorized access

### Data Isolation
- Users can only access their own loyalty data
- Database-level foreign key constraints
- Cascade deletion for data consistency

## Future Considerations

### Point Mutations
- Current implementation is read-only
- Future Order service will handle point changes
- Database triggers can update tiers automatically
- Transaction history will be populated by external services

### Integration Points
- **Order Service**: Will create loyalty transactions
- **Notification Service**: Can alert users of tier changes
- **Analytics Service**: Can track loyalty program metrics

### Scalability
- Database indexes support high-volume transaction queries
- Pagination prevents large result sets
- Modular design allows for easy feature additions

## API Documentation

### Swagger Integration
All endpoints include comprehensive Swagger documentation:
- Request/response schemas
- Authentication requirements
- Query parameter descriptions
- Error response codes

### Response Codes
- `200`: Successful retrieval
- `401`: Unauthorized (missing/invalid token)
- `404`: Loyalty account not found
- `500`: Internal server error

## Deployment Notes

### Database Migration
The loyalty system requires a new database migration:
```bash
npx prisma migrate dev --name add_loyalty_system
```

### Environment Variables
No additional environment variables are required beyond existing JWT configuration.

### Dependencies
The implementation uses existing dependencies:
- `@nestjs/common`
- `@nestjs/jwt`
- `@nestjs/config`
- `@nestjs/swagger`

## Conclusion

Phase 9 successfully implements the core loyalty system endpoints with:
- ✅ Current tier and balance exposure
- ✅ Paginated transaction history
- ✅ Proper authentication and authorization
- ✅ Comprehensive test coverage
- ✅ Database optimization and indexing
- ✅ Future-ready architecture for point mutations

The system is designed to be production-ready while maintaining flexibility for future enhancements and integrations.

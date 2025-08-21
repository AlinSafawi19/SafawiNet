# Safawinet - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Ports and Services](#ports-and-services)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Security Features](#security-features)
8. [Authentication & Authorization](#authentication--authorization)
9. [Email System](#email-system)
10. [Loyalty System](#loyalty-system)
11. [Monitoring & Observability](#monitoring--observability)
12. [Development & Deployment](#development--deployment)
13. [Testing](#testing)
14. [Performance & Scalability](#performance--scalability)

## Overview

Safawinet is a comprehensive web application built with a modern microservices architecture. It provides user authentication, loyalty management, email notifications, and administrative features with enterprise-grade security and monitoring capabilities.

## Technology Stack

### Backend Framework
- **NestJS** (v11.0.1) - Progressive Node.js framework for building scalable server-side applications
- **TypeScript** (v5.7.3) - Type-safe JavaScript
- **Node.js** (>=18.0.0) - JavaScript runtime

### Database & Caching
- **PostgreSQL** (v15-alpine) - Primary relational database with Prisma ORM
- **Redis** (v7-alpine) - In-memory data structure store for caching and sessions
- **Prisma** (v6.14.0) - Next-generation ORM for Node.js and TypeScript

### Authentication & Security
- **JWT** (JSON Web Tokens) - Stateless authentication
- **Passport.js** - Authentication middleware
- **Argon2** - Password hashing
- **bcrypt** - Additional password hashing
- **OTPLib** - Two-factor authentication (TOTP)
- **Speakeasy** - TOTP secret generation
- **QRCode** - QR code generation for 2FA setup

### Email & Communication
- **Nodemailer** (v7.0.5) - Email sending
- **Handlebars** (v4.7.8) - Email template engine
- **Mailhog** - Email testing and development

### Queue & Background Jobs
- **BullMQ** (v5.58.0) - Redis-based queue for Node.js
- **@nestjs/bullmq** (v11.0.3) - NestJS integration for BullMQ

### Monitoring & Observability
- **OpenTelemetry** - Distributed tracing and metrics
- **Sentry** (v10.5.0) - Error tracking and performance monitoring
- **Pino** (v9.9.0) - Fast Node.js logger
- **Pino HTTP** (v10.5.0) - HTTP request logging

### Validation & Documentation
- **Zod** (v4.0.17) - TypeScript-first schema validation
- **Swagger/OpenAPI** - API documentation
- **Class Validator** - DTO validation

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Supertest** - HTTP testing

## Architecture

### Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Load Balancer │
│   (React/Vue)   │◄──►│   (NestJS)      │◄──►│   (Nginx/ALB)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   Mailhog/SES   │
│   (Database)    │◄──►│   (Cache/Queue) │◄──►│   (Email)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Module Structure
- **AppModule** - Main application module
- **AuthModule** - Authentication and authorization
- **UsersModule** - User management
- **LoyaltyModule** - Loyalty system
- **HealthModule** - Health checks
- **Common Services** - Shared utilities and services

## Ports and Services

### Development Environment Ports
| Service | Port | Description |
|---------|------|-------------|
| API Server | 3000 | Main NestJS application |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache and queue |
| Mailhog SMTP | 1025 | Email testing |
| Mailhog Web UI | 8025 | Email interface |
| OpenTelemetry Collector | 13133 | Health check |
| OpenTelemetry gRPC | 4317 | OTLP gRPC |
| OpenTelemetry HTTP | 4318 | OTLP HTTP |

### Production Environment
- **API Server**: 3000 (internal), 80/443 (external)
- **Database**: 5432 (internal only)
- **Redis**: 6379 (internal only)
- **Email**: AWS SES integration

## API Endpoints

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://api.safawinet.com`

### API Versioning
- All endpoints use `/v1/` prefix
- Swagger documentation available at `/docs` (development only)

### Authentication Endpoints (`/v1/auth`)

#### User Registration & Verification
```http
POST /v1/auth/register
POST /v1/auth/verify-email
```

#### Login & Session Management
```http
POST /v1/auth/login
POST /v1/auth/refresh
POST /v1/auth/forgot-password
POST /v1/auth/reset-password
```

#### Two-Factor Authentication
```http
POST /v1/auth/2fa/setup
POST /v1/auth/2fa/enable
POST /v1/auth/2fa/disable
POST /v1/auth/2fa/login
```

#### Account Recovery
```http
POST /v1/auth/recover/request
POST /v1/auth/recover/confirm
POST /v1/auth/recover/complete
```

### User Management Endpoints (`/users`)

#### Admin User Management
```http
POST /users                    # Create admin user (ADMIN only)
GET /users/admins             # List admin users (ADMIN only)
GET /users/customers          # List customer users (ADMIN only)
```

#### User Profile Management
```http
GET /users/me                 # Get current user profile
PATCH /users/me               # Update user profile
PUT /users/me/preferences     # Update user preferences
PUT /users/me/notification-preferences # Update notification preferences
```

#### Email & Password Management
```http
POST /users/me/change-email   # Request email change
POST /users/me/change-password # Change password
POST /users/confirm-email-change # Confirm email change
```

#### Email Verification & Password Reset
```http
POST /users/verify-email      # Verify email with token
POST /users/request-password-reset # Request password reset
POST /users/reset-password    # Reset password with token
```

### Session Management Endpoints (`/v1/sessions`)

```http
GET /v1/sessions              # List user sessions
DELETE /v1/sessions/:id       # Delete specific session
DELETE /v1/sessions           # Revoke all sessions except current
DELETE /v1/sessions/revoke-family/:familyId # Revoke token family
DELETE /v1/sessions/revoke-user/:userId # Revoke all user sessions (ADMIN)
GET /v1/sessions/security-audit/:userId # Security audit info
```

### Notifications Endpoints (`/v1/notifications`)

```http
GET /v1/notifications         # List user notifications
POST /v1/notifications/:id/read # Mark notification as read
GET /v1/notifications/unread-count # Get unread count
```

### Loyalty System Endpoints (`/v1/loyalty`)

```http
GET /v1/loyalty/me            # Get current user loyalty account
GET /v1/loyalty/transactions  # Get loyalty transaction history
```

### Health & Monitoring Endpoints

#### Health Checks
```http
GET /health                   # Basic health check
GET /health/liveness          # Liveness probe
GET /health/readiness         # Readiness probe
```

#### Performance Monitoring
```http
GET /performance/stats        # Performance statistics
GET /performance/stats/:route # Route-specific stats
GET /performance/budgets      # Performance budget compliance
GET /performance/burst-rates  # Current burst rates
GET /performance/queues       # Queue status
```

#### Maintenance Endpoints
```http
GET /performance/cleanup/tokens       # Manual token cleanup
GET /performance/cleanup/sessions     # Manual session cleanup
GET /performance/cleanup/notifications # Manual notification cleanup
```

### Admin Endpoints (`/admin`)

```http
GET /admin/users              # User management (ADMIN only)
GET /admin/system/stats       # System statistics (ADMIN only)
GET /admin/system/email-monitoring # Email monitoring stats (ADMIN only)
```

### Email Monitoring Endpoints (`/v1/email-monitoring`)

```http
GET /v1/email-monitoring/health # Email delivery health
GET /v1/email-monitoring/metrics # Email delivery metrics
GET /v1/email-monitoring/logs  # Email delivery logs
POST /v1/email-monitoring/ses/bounce # SES bounce webhook
POST /v1/email-monitoring/ses/complaint # SES complaint webhook
```

## Database Schema

### Core Tables

#### Users
- `users` - Main user table with authentication and profile data
- `one_time_tokens` - Email verification and password reset tokens
- `refresh_sessions` - JWT refresh token management
- `two_factor_secrets` - 2FA secret storage
- `backup_codes` - 2FA backup codes
- `user_sessions` - Active user sessions with device info

#### Security & Recovery
- `recovery_staging` - Account recovery process
- `pending_email_changes` - Email change requests
- `notifications` - User notifications

#### Loyalty System
- `loyalty_tiers` - Loyalty program tiers
- `loyalty_accounts` - User loyalty accounts
- `loyalty_transactions` - Loyalty point transactions

#### Monitoring
- `email_logs` - Email delivery tracking

### User Roles
- `CUSTOMER` - Regular user
- `ADMIN` - Administrative user
- `MODERATOR` - Content moderation
- `SUPPORT` - Customer support

## Security Features

### Authentication Security
- **JWT-based authentication** with access and refresh tokens
- **Password hashing** using Argon2 and bcrypt
- **Two-factor authentication** with TOTP support
- **Backup codes** for 2FA recovery
- **Session management** with device fingerprinting
- **Token family management** for security incidents

### Authorization
- **Role-based access control** (RBAC)
- **JWT guards** for protected routes
- **Role guards** for admin-only endpoints
- **Custom decorators** for role checking

### Rate Limiting
- **Global rate limiting** (100 requests per minute)
- **Login-specific rate limiting** (300 requests per minute)
- **Custom rate limits** for sensitive operations
- **Burst protection** for login endpoints

### Security Headers
- **Helmet.js** for security headers
- **CORS** configuration with allowed origins
- **Content Security Policy** (CSP)
- **HSTS** (HTTP Strict Transport Security)
- **XSS protection** and content type sniffing prevention

### Input Validation
- **Zod schemas** for request validation
- **Class validator** for DTO validation
- **SQL injection prevention** through Prisma ORM
- **XSS prevention** through input sanitization

## Authentication & Authorization

### JWT Token Structure
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "roles": ["CUSTOMER"],
  "iat": 1640995200,
  "exp": 1640996100
}
```

### Token Expiration
- **Access Token**: 15 minutes
- **Refresh Token**: 7 days
- **Email Verification**: 24 hours
- **Password Reset**: 1 hour
- **Email Change**: 1 hour
- **Account Recovery**: 24 hours

### Two-Factor Authentication
- **TOTP-based** (Time-based One-Time Password)
- **QR code generation** for authenticator apps
- **Backup codes** for account recovery
- **Device fingerprinting** for session tracking

## Email System

### Email Types
- **Email Verification** - Account verification
- **Password Reset** - Password recovery
- **Email Change** - Email address updates
- **Account Recovery** - Account recovery process
- **Security Alerts** - Security notifications
- **Marketing** - Promotional emails (opt-in)

### Email Providers
- **Development**: Mailhog (local testing)
- **Production**: AWS SES (Simple Email Service)

### Email Monitoring
- **Delivery tracking** with logs
- **Bounce handling** with SES webhooks
- **Complaint processing** for spam reports
- **Health monitoring** for delivery rates

### Email Templates
- **Handlebars** templating engine
- **HTML and text** versions
- **Branded templates** with Safawinet styling
- **Localization support** for multiple languages

## Loyalty System

### Loyalty Tiers
- **Bronze** (0-999 points)
- **Silver** (1000-4999 points)
- **Gold** (5000-19999 points)
- **Platinum** (20000+ points)

### Point System
- **Earning**: Purchase-based point accumulation
- **Redemption**: Point-based rewards
- **Expiration**: Points expire after 12 months
- **Tier Benefits**: Exclusive perks per tier

### Transaction Types
- **Earn** - Points earned from purchases
- **Redeem** - Points spent on rewards
- **Expire** - Expired points
- **Adjust** - Manual adjustments
- **Bonus** - Promotional bonuses

## Monitoring & Observability

### Logging
- **Structured logging** with Pino
- **Request/response logging** with correlation IDs
- **Error tracking** with Sentry integration
- **Performance logging** for slow queries

### Metrics
- **OpenTelemetry** for distributed tracing
- **Custom metrics** for business KPIs
- **Performance budgets** for response times
- **Queue monitoring** for background jobs

### Health Checks
- **Liveness probes** for container health
- **Readiness probes** for service availability
- **Database connectivity** checks
- **Redis connectivity** checks
- **Email service** health monitoring

### Alerting
- **Error rate** monitoring
- **Response time** alerts
- **Queue backlog** alerts
- **Email delivery** failure alerts

## Development & Deployment

### Development Environment
```bash
# Start development environment
npm run docker:up

# Run API in development mode
npm run start:dev

# Access services
API: http://localhost:3000
Swagger: http://localhost:3000/docs
Mailhog: http://localhost:8025
```

### Database Management
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Load testing
npm run k6:load
npm run k6:burst
```

### Deployment
```bash
# Deploy to different environments
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod
```

## Testing

### Test Types
- **Unit Tests** - Individual component testing
- **Integration Tests** - Service integration testing
- **E2E Tests** - Full application testing
- **Load Tests** - Performance and stress testing

### Test Coverage
- **Authentication flows** - Login, registration, 2FA
- **User management** - Profile updates, preferences
- **Loyalty system** - Points, tiers, transactions
- **Email system** - Delivery, templates, monitoring
- **Security features** - Rate limiting, authorization

### Load Testing
- **K6** for performance testing
- **Burst testing** for login endpoints
- **Sustained load** testing for API endpoints
- **Database stress** testing

## Performance & Scalability

### Performance Optimizations
- **Database indexing** for query optimization
- **Redis caching** for frequently accessed data
- **Connection pooling** for database connections
- **Request compression** with gzip
- **Static file serving** optimization

### Scalability Features
- **Horizontal scaling** with load balancers
- **Database read replicas** for read-heavy workloads
- **Redis clustering** for high availability
- **Queue-based processing** for background jobs
- **CDN integration** for static assets

### Performance Monitoring
- **Response time** tracking
- **Throughput** monitoring
- **Error rate** tracking
- **Resource utilization** monitoring
- **Custom business metrics**

### Caching Strategy
- **User sessions** in Redis
- **Loyalty data** caching
- **Email templates** caching
- **API responses** caching
- **Database query** result caching

---

## Quick Start Guide

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Start services**: `npm run docker:up`
4. **Run migrations**: `npm run db:migrate`
5. **Seed database**: `npm run db:seed`
6. **Start development server**: `npm run start:dev`
7. **Access API documentation**: `http://localhost:3000/docs`

## Support & Maintenance

### Monitoring
- **Application logs** via Pino
- **Error tracking** via Sentry
- **Performance metrics** via OpenTelemetry
- **Email delivery** monitoring

### Maintenance Tasks
- **Token cleanup** - Expired token removal
- **Session cleanup** - Inactive session removal
- **Notification cleanup** - Expired notification removal
- **Email log cleanup** - Old email log removal

### Security Updates
- **Regular dependency** updates
- **Security patches** application
- **Vulnerability scanning** integration
- **Penetration testing** scheduling

---

*This documentation is maintained as part of the Safawinet project. For questions or contributions, please refer to the project repository.*

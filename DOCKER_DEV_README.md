# Safawinet Development Environment

This document describes how to run the Safawinet application in a Docker development environment.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │    │   API           │    │   Database      │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (PostgreSQL)  │
│   Port: 3001    │    │   Port: 3000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MailHog       │    │   Redis         │    │   OpenTelemetry │
│   Port: 8025    │    │   Port: 6379    │    │   Port: 4317    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Services Included

| Service | Container Name | Port | Purpose |
|---------|----------------|------|---------|
| **Client** | safawinet-client | 3001 | Next.js frontend application |
| **API** | safawinet-api | 3000 | NestJS backend API |
| **PostgreSQL** | safawinet-postgres | 5432 | Primary database |
| **Redis** | safawinet-redis | 6379 | Caching and session storage |
| **MailHog** | safawinet-mailhog | 1025/8025 | Email testing (SMTP/Web UI) |
| **OpenTelemetry** | safawinet-otel | 4317/4318 | Application monitoring and tracing |

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)
- Git (for cloning the repository)

## Quick Start

### Option 1: Using the Development Script

**PowerShell:**
```powershell
.\dev.ps1
```

### Option 2: Manual Docker Compose

```powershell
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Service URLs

Once all services are running, you can access:

- **Frontend Application**: http://localhost:3001
- **API Documentation**: http://localhost:3000/docs
- **MailHog Web UI**: http://localhost:8025
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Development Workflow

### Hot Reloading

Both the client and API services are configured with hot reloading:

- **Client**: File changes in `./client` will automatically trigger Next.js hot reload
- **API**: File changes in `./server/api` will automatically trigger NestJS hot reload

### Database Management

The API service automatically runs database migrations and seeding on startup. If you need to manually manage the database:

```powershell
# Access the API container
docker-compose exec api bash

# Run Prisma commands
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

### Email Testing

All emails sent by the application are captured by MailHog:

1. Open http://localhost:8025 in your browser
2. Trigger any email-sending functionality in your app
3. View the captured emails in the MailHog interface

### Monitoring and Logs

#### View Service Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f client
docker-compose logs -f postgres
```

#### OpenTelemetry Monitoring
The application includes OpenTelemetry instrumentation for monitoring:
- Traces are sent to the OpenTelemetry collector
- Metrics are available at http://localhost:8889
- Logs are collected and can be viewed through the collector

## Common Commands

### Service Management
```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart api

# Rebuild and start services
docker-compose up --build -d
```

### Container Management
```powershell
# Execute commands in containers
docker-compose exec api bash
docker-compose exec client bash
docker-compose exec postgres psql -U postgres -d safawinet_dev

# View container status
docker-compose ps

# View resource usage
docker stats
```

### Database Operations
```powershell
# Access PostgreSQL directly
docker-compose exec postgres psql -U postgres -d safawinet_dev

# Backup database
docker-compose exec postgres pg_dump -U postgres safawinet_dev > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d safawinet_dev < backup.sql
```

## Environment Configuration

The development environment uses the following configuration files:

- `env.dev` - Environment variables for the API
- `docker-compose.yml` - Service definitions and networking
- `otel-collector-config.yaml` - OpenTelemetry collector configuration

### Customizing Environment Variables

To modify environment variables:

1. Edit the `env.dev` file
2. Restart the affected services:
   ```powershell
   docker-compose restart api
   ```

## Troubleshooting

### Port Conflicts
If you encounter port conflicts, you can modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3001:3001"  # Change the first number to an available port
```

### Database Connection Issues
If the API can't connect to the database:

1. Ensure PostgreSQL is running: `docker-compose ps`
2. Check database logs: `docker-compose logs postgres`
3. Verify the connection string in `env.dev`

### Memory Issues
If you encounter memory issues:

1. Increase Docker Desktop memory allocation
2. Restart Docker Desktop
3. Clean up unused containers: `docker system prune`

### Clean Slate
To start completely fresh:

```powershell
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a

# Start fresh
docker-compose up --build -d
```

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f [service]`
2. Verify all services are running: `docker-compose ps`
3. Ensure Docker Desktop has sufficient resources allocated
4. Try a clean restart: `docker-compose down -v && docker-compose up --build -d`

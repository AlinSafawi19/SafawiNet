# Safawinet Development Environment Setup Script for PowerShell

Write-Host "Starting Safawinet Development Environment..." -ForegroundColor Blue

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is available
try {
    docker-compose --version | Out-Null
} catch {
    Write-Host "[ERROR] Docker Compose is not installed. Please install Docker Compose and try again." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Building and starting all services..." -ForegroundColor Blue

# Build and start all services
docker-compose up --build -d

Write-Host "[INFO] Waiting for services to be ready..." -ForegroundColor Blue

# Wait for PostgreSQL to be ready
Write-Host "[INFO] Waiting for PostgreSQL..." -ForegroundColor Blue
do {
    Start-Sleep -Seconds 1
    $postgresReady = docker-compose exec postgres pg_isready -U postgres 2>$null
} while ($LASTEXITCODE -ne 0)
Write-Host "[SUCCESS] PostgreSQL is ready!" -ForegroundColor Green

# Wait for Redis to be ready
Write-Host "[INFO] Waiting for Redis..." -ForegroundColor Blue
do {
    Start-Sleep -Seconds 1
    $redisReady = docker-compose exec redis redis-cli ping 2>$null
} while ($LASTEXITCODE -ne 0)
Write-Host "[SUCCESS] Redis is ready!" -ForegroundColor Green

# Wait for MailHog to be ready
Write-Host "[INFO] Waiting for MailHog..." -ForegroundColor Blue
do {
    Start-Sleep -Seconds 1
    try {
        Invoke-WebRequest -Uri "http://localhost:8025" -UseBasicParsing | Out-Null
        $mailhogReady = $true
    } catch {
        $mailhogReady = $false
    }
} while (-not $mailhogReady)
Write-Host "[SUCCESS] MailHog is ready!" -ForegroundColor Green

Write-Host "[SUCCESS] All services are ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Services are now running:" -ForegroundColor Yellow
Write-Host "  • Client (Next.js):     http://localhost:3001" -ForegroundColor White
Write-Host "  • API (NestJS):         http://localhost:3000" -ForegroundColor White
Write-Host "  • API Docs:             http://localhost:3000/docs" -ForegroundColor White
Write-Host "  • MailHog Web UI:       http://localhost:8025" -ForegroundColor White
Write-Host "  • PostgreSQL:           localhost:5432" -ForegroundColor White
Write-Host "  • Redis:                localhost:6379" -ForegroundColor White
Write-Host "  • OpenTelemetry:        localhost:4317" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  • View logs:            docker-compose logs -f [service]" -ForegroundColor White
Write-Host "  • Stop services:        docker-compose down" -ForegroundColor White
Write-Host "  • Restart service:      docker-compose restart [service]" -ForegroundColor White
Write-Host "  • Execute command:      docker-compose exec [service] [command]" -ForegroundColor White
Write-Host ""
Write-Host "[SUCCESS] Development environment is ready!" -ForegroundColor Green

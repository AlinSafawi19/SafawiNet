# Safawinet Development Scripts for Windows
# Usage: .\scripts\dev.ps1 <command>

param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

function Start-Dev {
    Write-Host "Starting development environment..." -ForegroundColor Green
    docker compose up -d
    npm run prisma:generate
    npm run db:migrate
    npm run start:dev
}

function Start-Infra {
    Write-Host "Starting infrastructure services..." -ForegroundColor Green
    docker compose up -d
}

function Stop-Infra {
    Write-Host "Stopping infrastructure services..." -ForegroundColor Yellow
    docker compose down
}

function Test-All {
    Write-Host "Running all tests..." -ForegroundColor Green
    npm run test
    npm run test:e2e
}

function Test-Perf {
    Write-Host "Running performance tests..." -ForegroundColor Green
    k6 run tests/perf/login_burst.js
}

function Migrate-DB {
    Write-Host "Running database migrations..." -ForegroundColor Green
    npm run prisma:generate
    npm run db:migrate
}

function Deploy-Migrate {
    Write-Host "Deploying database migrations (for staging/prod)..." -ForegroundColor Green
    npm run db:migrate:deploy
}

function Show-Help {
    Write-Host "Available commands:" -ForegroundColor Cyan
    Write-Host "  start-dev     - Start full development environment" -ForegroundColor White
    Write-Host "  start-infra   - Start only infrastructure services" -ForegroundColor White
    Write-Host "  stop-infra    - Stop infrastructure services" -ForegroundColor White
    Write-Host "  test          - Run all tests" -ForegroundColor White
    Write-Host "  test-perf     - Run performance tests" -ForegroundColor White
    Write-Host "  migrate       - Run database migrations" -ForegroundColor White
    Write-Host "  deploy-migrate - Deploy migrations (staging/prod)" -ForegroundColor White
    Write-Host "  help          - Show this help" -ForegroundColor White
}

# Main command dispatcher
switch ($Command.ToLower()) {
    "start-dev" { Start-Dev }
    "start-infra" { Start-Infra }
    "stop-infra" { Stop-Infra }
    "test" { Test-All }
    "test-perf" { Test-Perf }
    "migrate" { Migrate-DB }
    "deploy-migrate" { Deploy-Migrate }
    "help" { Show-Help }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help
        exit 1
    }
}

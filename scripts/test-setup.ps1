Write-Host "🧪 Testing Safawinet API Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Check if services are running
Write-Host "📋 Checking Docker services..." -ForegroundColor Yellow
$services = docker-compose ps --format "table {{.Name}}\t{{.Status}}"
if ($services -match "Up") {
    Write-Host "✅ Docker services are running" -ForegroundColor Green
} else {
    Write-Host "❌ Docker services are not running. Starting them..." -ForegroundColor Yellow
    docker-compose up -d
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
}

# Check API health
Write-Host "🏥 Checking API health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API is responding" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ API is not responding. Starting it..." -ForegroundColor Yellow
    Set-Location server/api
    Start-Process -FilePath "npm" -ArgumentList "run", "start:dev" -WindowStyle Hidden
    Set-Location ../..
    Write-Host "⏳ Waiting for API to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ API is now responding" -ForegroundColor Green
            Write-Host "Response: $($response.Content)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ API is still not responding" -ForegroundColor Red
    }
}

# Check database connection
Write-Host "🗄️  Checking database connection..." -ForegroundColor Yellow
try {
    docker-compose exec -T postgres pg_isready -U postgres | Out-Null
    Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL is not ready" -ForegroundColor Red
}

# Check Redis connection
Write-Host "🔴 Checking Redis connection..." -ForegroundColor Yellow
try {
    docker-compose exec -T redis redis-cli ping | Out-Null
    Write-Host "✅ Redis is ready" -ForegroundColor Green
} catch {
    Write-Host "❌ Redis is not ready" -ForegroundColor Red
}

# Check Mailhog
Write-Host "📧 Checking Mailhog..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8025" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Mailhog is accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Mailhog is not accessible" -ForegroundColor Red
}

# Check OTel Collector
Write-Host "📊 Checking OpenTelemetry Collector..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:13133" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ OTel Collector is accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ OTel Collector is not accessible" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Setup Test Summary:" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "🌐 Service URLs:" -ForegroundColor Cyan
Write-Host "API: http://localhost:3000" -ForegroundColor White
Write-Host "Health: http://localhost:3000/health" -ForegroundColor White
Write-Host "Swagger: http://localhost:3000/docs" -ForegroundColor White
Write-Host "Mailhog: http://localhost:8025" -ForegroundColor White
Write-Host "PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "Redis: localhost:6379" -ForegroundColor White

Write-Host ""
Write-Host "✅ Setup test complete!" -ForegroundColor Green

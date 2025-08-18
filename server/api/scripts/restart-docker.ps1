# Docker Restart Script for Safawinet API
# This script restarts Docker containers and waits for them to be healthy

param(
    [switch]$Help,
    [switch]$Rebuild,
    [switch]$Logs
)

if ($Help) {
    Write-Host @"
Docker Restart Script for Safawinet API

Usage: .\restart-docker.ps1 [options]

Options:
    -Rebuild        Rebuild containers before starting
    -Logs           Show logs after restart
    -Help           Show this help message

This script:
1. Stops existing containers
2. Optionally rebuilds containers
3. Starts containers in detached mode
4. Waits for containers to be healthy
5. Optionally shows logs
"@
    exit 0
}

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Test-APIHealth {
    param([int]$MaxRetries = 10)
    
    Write-ColorOutput "Testing API health..." $Blue
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5
            if ($response.status -eq "ok") {
                Write-ColorOutput "✓ API is healthy" $Green
                return $true
            }
        }
        catch {
            Write-ColorOutput "⏳ API not ready yet (attempt $i/$MaxRetries)..." $Yellow
        }
        
        Start-Sleep -Seconds 3
    }
    
    Write-ColorOutput "✗ API health check failed after $MaxRetries attempts" $Red
    return $false
}

# Main execution
Write-ColorOutput "=== DOCKER RESTART SCRIPT ===" $Blue

# Check if we're in the right directory
if (-not (Test-Path "docker-compose.yml")) {
    Write-ColorOutput "✗ docker-compose.yml not found. Please run this script from the project root." $Red
    exit 1
}

# Stop existing containers
Write-ColorOutput "Stopping existing containers..." $Blue
try {
    docker-compose down
    Write-ColorOutput "✓ Containers stopped" $Green
}
catch {
    Write-ColorOutput "⚠ Error stopping containers: $($_.Exception.Message)" $Yellow
}

# Rebuild if requested
if ($Rebuild) {
    Write-ColorOutput "Rebuilding containers..." $Blue
    try {
        docker-compose build --no-cache
        Write-ColorOutput "✓ Containers rebuilt" $Green
    }
    catch {
        Write-ColorOutput "✗ Error rebuilding containers: $($_.Exception.Message)" $Red
        exit 1
    }
}

# Start containers
Write-ColorOutput "Starting containers..." $Blue
try {
    docker-compose up -d
    Write-ColorOutput "✓ Containers started" $Green
}
catch {
    Write-ColorOutput "✗ Error starting containers: $($_.Exception.Message)" $Red
    exit 1
}

# Wait for containers to be ready
Write-ColorOutput "Waiting for containers to be ready..." $Blue
Start-Sleep -Seconds 5

# Check container status
Write-ColorOutput "`n=== CONTAINER STATUS ===" $Blue
try {
    $status = docker-compose ps
    Write-ColorOutput $status $Blue
}
catch {
    Write-ColorOutput "Could not get container status" $Yellow
}

# Wait for API to be healthy
$apiHealthy = Test-APIHealth
if (-not $apiHealthy) {
    Write-ColorOutput "`n⚠ API may not be fully ready yet. Check logs for details." $Yellow
}

# Show logs if requested
if ($Logs) {
    Write-ColorOutput "`n=== RECENT LOGS ===" $Blue
    try {
        $logs = docker-compose logs --tail=20
        Write-ColorOutput $logs $Blue
    }
    catch {
        Write-ColorOutput "Could not retrieve logs" $Yellow
    }
}

Write-ColorOutput "`n=== RESTART COMPLETE ===" $Blue
Write-ColorOutput "Containers are running. You can now:" $Blue
Write-ColorOutput "1. Test the API: curl http://localhost:3000/health" $Blue
Write-ColorOutput "2. View logs: docker-compose logs -f api" $Blue
Write-ColorOutput "3. Run tests: .\test-cross-cutting-features-docker.ps1" $Blue
Write-ColorOutput "4. Check Redis: docker-compose exec redis redis-cli ping" $Blue

if ($apiHealthy) {
    Write-ColorOutput "`n🎉 API is ready for testing!" $Green
} else {
    Write-ColorOutput "`n⚠ API may need more time to start. Check logs for details." $Yellow
}

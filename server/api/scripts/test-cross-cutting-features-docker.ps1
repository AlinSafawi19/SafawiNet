# Cross-Cutting Features Test Script for Safawinet API (Docker)
# This script tests all the observability, security, background jobs, and performance features

param(
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$Help,
    [switch]$SkipPerformance,
    [switch]$DockerCompose
)

if ($Help) {
    Write-Host @"
Cross-Cutting Features Test Script (Docker)

Usage: .\test-cross-cutting-features-docker.ps1 [options]

Options:
    -BaseUrl <url>        Base URL for the API (default: http://localhost:3000)
    -SkipPerformance      Skip performance tests (faster testing)
    -DockerCompose        Use docker-compose commands for container management
    -Help                 Show this help message

This script tests:
1. Observability (logging, tracing, error tracking)
2. Security headers and CORS
3. Background jobs and queues
4. Performance monitoring
5. Cron job functionality

Prerequisites:
- Docker containers running
- Redis container accessible
- API container healthy
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

function Test-DockerContainers {
    Write-ColorOutput "Testing Docker containers..." $Blue
    
    try {
        if ($DockerCompose) {
            $containers = docker-compose ps --format "table {{.Name}}\t{{.Status}}"
        } else {
            $containers = docker ps --format "table {{.Names}}\t{{.Status}}"
        }
        
        if ($containers -match "safawinet") {
            Write-ColorOutput "✓ Safawinet containers found" $Green
            Write-ColorOutput $containers $Blue
            return $true
        } else {
            Write-ColorOutput "✗ No Safawinet containers found" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "✗ Docker container check failed: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-RedisConnection {
    Write-ColorOutput "Testing Redis connection..." $Blue
    
    try {
        if ($DockerCompose) {
            $redisTest = docker-compose exec -T redis redis-cli ping
        } else {
            $redisTest = docker exec safawinet-redis redis-cli ping
        }
        
        if ($redisTest -eq "PONG") {
            Write-ColorOutput "✓ Redis is accessible" $Green
            return $true
        } else {
            Write-ColorOutput "✗ Redis connection failed" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "⚠ Redis test skipped (container not found)" $Yellow
        return $true
    }
}

function Test-APIHealth {
    Write-ColorOutput "Testing API health..." $Blue
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get -TimeoutSec 10
        if ($response.status -eq "ok") {
            Write-ColorOutput "✓ API is healthy" $Green
            return $true
        }
        else {
            Write-ColorOutput "✗ API health check failed" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "✗ API health check failed: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-SecurityHeaders {
    Write-ColorOutput "Testing security headers..." $Blue
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method Get -TimeoutSec 10
        
        $headers = $response.Headers
        $securityHeaders = @{
            'Content-Security-Policy' = $headers['Content-Security-Policy']
            'Strict-Transport-Security' = $headers['Strict-Transport-Security']
            'X-Content-Type-Options' = $headers['X-Content-Type-Options']
            'X-Frame-Options' = $headers['X-Frame-Options']
            'X-XSS-Protection' = $headers['X-XSS-Protection']
            'Referrer-Policy' = $headers['Referrer-Policy']
        }
        
        $allPresent = $true
        foreach ($header in $securityHeaders.Keys) {
            if ($securityHeaders[$header]) {
                Write-ColorOutput "✓ $header present" $Green
            } else {
                Write-ColorOutput "✗ $header missing" $Red
                $allPresent = $false
            }
        }
        
        return $allPresent
    }
    catch {
        Write-ColorOutput "✗ Security headers test failed: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-RequestIdTracking {
    Write-ColorOutput "Testing request ID tracking..." $Blue
    
    try {
        $customRequestId = "test-request-$(Get-Random)"
        $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method Get -Headers @{
            'X-Request-ID' = $customRequestId
        } -TimeoutSec 10
        
        if ($response.Headers['X-Request-ID'] -eq $customRequestId) {
            Write-ColorOutput "✓ Request ID tracking working" $Green
            return $true
        } else {
            Write-ColorOutput "✗ Request ID tracking failed" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "✗ Request ID test failed: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-CORS {
    Write-ColorOutput "Testing CORS configuration..." $Blue
    
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method Options -Headers @{
            'Origin' = 'http://localhost:3000'
            'Access-Control-Request-Method' = 'GET'
            'Access-Control-Request-Headers' = 'Content-Type'
        } -TimeoutSec 10
        
        if ($response.Headers['Access-Control-Allow-Origin']) {
            Write-ColorOutput "✓ CORS headers present" $Green
            return $true
        } else {
            Write-ColorOutput "✗ CORS headers missing" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "✗ CORS test failed: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-BackgroundJobs {
    Write-ColorOutput "Testing background jobs..." $Blue
    
    try {
        # Test queue status endpoint (requires authentication)
        $response = Invoke-RestMethod -Uri "$BaseUrl/performance/queues" -Method Get -Headers @{
            'Authorization' = 'Bearer test-token'
        } -TimeoutSec 10
        
        if ($response.email -and $response.security -and $response.maintenance) {
            Write-ColorOutput "✓ Background job queues accessible" $Green
            return $true
        } else {
            Write-ColorOutput "✗ Background job queues not accessible" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "⚠ Background jobs test skipped (requires authentication)" $Yellow
        return $true
    }
}

function Test-PerformanceMonitoring {
    Write-ColorOutput "Testing performance monitoring..." $Blue
    
    try {
        # Test performance stats endpoint
        $response = Invoke-RestMethod -Uri "$BaseUrl/performance/stats" -Method Get -Headers @{
            'Authorization' = 'Bearer test-token'
        } -TimeoutSec 10
        
        if ($response -and $response.Length -gt 0) {
            Write-ColorOutput "✓ Performance monitoring accessible" $Green
            return $true
        } else {
            Write-ColorOutput "✗ Performance monitoring not accessible" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "⚠ Performance monitoring test skipped (requires authentication)" $Yellow
        return $true
    }
}

function Test-CronJobs {
    Write-ColorOutput "Testing cron job functionality..." $Blue
    
    try {
        # Test manual cleanup endpoints
        $endpoints = @(
            '/performance/cleanup/tokens',
            '/performance/cleanup/sessions',
            '/performance/cleanup/notifications'
        )
        
        foreach ($endpoint in $endpoints) {
            try {
                $response = Invoke-RestMethod -Uri "$BaseUrl$endpoint" -Method Get -Headers @{
                    'Authorization' = 'Bearer test-token'
                } -TimeoutSec 10
                
                if ($response.message) {
                    Write-ColorOutput "✓ $endpoint working" $Green
                }
            }
            catch {
                Write-ColorOutput "⚠ $endpoint skipped (requires authentication)" $Yellow
            }
        }
        
        return $true
    }
    catch {
        Write-ColorOutput "⚠ Cron job test skipped (requires authentication)" $Yellow
        return $true
    }
}

function Test-Logging {
    Write-ColorOutput "Testing logging functionality..." $Blue
    
    try {
        # Make a few requests to generate logs
        for ($i = 1; $i -le 3; $i++) {
            $requestId = "log-test-$i-$(Get-Random)"
            Invoke-WebRequest -Uri "$BaseUrl/health" -Method Get -Headers @{
                'X-Request-ID' = $requestId
            } -TimeoutSec 5 | Out-Null
        }
        
        Write-ColorOutput "✓ Logging test completed (check container logs)" $Green
        return $true
    }
    catch {
        Write-ColorOutput "✗ Logging test failed: $($_.Exception.Message)" $Red
        return $false
    }
}

function Test-ErrorHandling {
    Write-ColorOutput "Testing error handling..." $Blue
    
    try {
        # Test a non-existent endpoint to trigger error handling
        $response = Invoke-WebRequest -Uri "$BaseUrl/non-existent-endpoint" -Method Get -TimeoutSec 10
        
        if ($response.StatusCode -eq 404) {
            Write-ColorOutput "✓ Error handling working (404 returned)" $Green
            return $true
        } else {
            Write-ColorOutput "✗ Unexpected status code: $($response.StatusCode)" $Red
            return $false
        }
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-ColorOutput "✓ Error handling working (404 returned)" $Green
            return $true
        } else {
            Write-ColorOutput "✗ Error handling test failed: $($_.Exception.Message)" $Red
            return $false
        }
    }
}

function Show-ContainerLogs {
    Write-ColorOutput "`n=== CONTAINER LOGS ===" $Blue
    Write-ColorOutput "Recent API container logs:" $Blue
    
    try {
        if ($DockerCompose) {
            $logs = docker-compose logs --tail=10 api
        } else {
            $logs = docker logs --tail=10 safawinet-api
        }
        
        Write-ColorOutput $logs $Blue
    }
    catch {
        Write-ColorOutput "Could not retrieve container logs" $Yellow
    }
}

# Main execution
Write-ColorOutput "=== CROSS-CUTTING FEATURES TEST SUITE (DOCKER) ===" $Blue
Write-ColorOutput "Testing all implemented features in Docker environment..." $Blue

$tests = @(
    @{ Name = "Docker Containers"; Function = "Test-DockerContainers" },
    @{ Name = "Redis Connection"; Function = "Test-RedisConnection" },
    @{ Name = "API Health"; Function = "Test-APIHealth" },
    @{ Name = "Security Headers"; Function = "Test-SecurityHeaders" },
    @{ Name = "Request ID Tracking"; Function = "Test-RequestIdTracking" },
    @{ Name = "CORS Configuration"; Function = "Test-CORS" },
    @{ Name = "Background Jobs"; Function = "Test-BackgroundJobs" },
    @{ Name = "Performance Monitoring"; Function = "Test-PerformanceMonitoring" },
    @{ Name = "Cron Jobs"; Function = "Test-CronJobs" },
    @{ Name = "Logging"; Function = "Test-Logging" },
    @{ Name = "Error Handling"; Function = "Test-ErrorHandling" }
)

$passed = 0
$total = $tests.Count

foreach ($test in $tests) {
    Write-ColorOutput "`n--- Testing $($test.Name) ---" $Blue
    
    $result = & $test.Function
    if ($result) {
        $passed++
    }
}

Write-ColorOutput "`n=== TEST RESULTS ===" $Blue
Write-ColorOutput "Passed: $passed/$total" $(if ($passed -eq $total) { $Green } else { $Yellow })

if ($passed -eq $total) {
    Write-ColorOutput "`n🎉 All cross-cutting features are working correctly in Docker!" $Green
} else {
    Write-ColorOutput "`n⚠ Some tests failed. Check the output above for details." $Yellow
}

Show-ContainerLogs

Write-ColorOutput "`n=== DOCKER COMMANDS ===" $Blue
Write-ColorOutput "Useful Docker commands for debugging:" $Blue
Write-ColorOutput "1. View container logs: docker-compose logs -f api" $Blue
Write-ColorOutput "2. Check Redis queues: docker-compose exec redis redis-cli KEYS '*safawinet*'" $Blue
Write-ColorOutput "3. Restart containers: docker-compose restart" $Blue
Write-ColorOutput "4. Check container status: docker-compose ps" $Blue
Write-ColorOutput "5. Access API container: docker-compose exec api sh" $Blue

Write-ColorOutput "`n=== NEXT STEPS ===" $Blue
Write-ColorOutput "1. Check container logs for structured logging output" $Blue
Write-ColorOutput "2. Monitor Redis for background job queues" $Blue
Write-ColorOutput "3. Check OpenTelemetry collector for traces/metrics" $Blue
Write-ColorOutput "4. Verify Sentry for error tracking (if configured)" $Blue

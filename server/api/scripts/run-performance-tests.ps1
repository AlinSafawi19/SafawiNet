# Performance Test Runner Script for Safawinet API
# This script runs k6 performance tests to validate performance budgets

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$K6Path = "k6",
    [int]$TestDuration = 600, # 10 minutes
    [switch]$InstallK6,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Performance Test Runner for Safawinet API

Usage: .\run-performance-tests.ps1 [options]

Options:
    -BaseUrl <url>        Base URL for the API (default: http://localhost:3000)
    -K6Path <path>        Path to k6 executable (default: k6)
    -TestDuration <sec>   Test duration in seconds (default: 600)
    -InstallK6            Install k6 if not present
    -Help                 Show this help message

Examples:
    .\run-performance-tests.ps1
    .\run-performance-tests.ps1 -BaseUrl "https://api.safawinet.com"
    .\run-performance-tests.ps1 -TestDuration 300
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

function Test-K6Installed {
    try {
        $null = & $K6Path version 2>$null
        return $true
    }
    catch {
        return $false
    }
}

function Install-K6 {
    Write-ColorOutput "Installing k6..." $Blue
    
    if ($IsWindows) {
        # Windows installation using Chocolatey
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            Write-ColorOutput "Installing k6 using Chocolatey..." $Blue
            choco install k6 -y
        }
        else {
            Write-ColorOutput "Chocolatey not found. Please install k6 manually:" $Yellow
            Write-ColorOutput "1. Download from: https://k6.io/docs/getting-started/installation/" $Yellow
            Write-ColorOutput "2. Or install Chocolatey and run: choco install k6 -y" $Yellow
            exit 1
        }
    }
    else {
        # Linux/macOS installation
        Write-ColorOutput "Installing k6 using package manager..." $Blue
        if (Get-Command apt-get -ErrorAction SilentlyContinue) {
            # Ubuntu/Debian
            sudo apt-get update
            sudo apt-get install -y k6
        }
        elseif (Get-Command yum -ErrorAction SilentlyContinue) {
            # CentOS/RHEL
            sudo yum install -y k6
        }
        elseif (Get-Command brew -ErrorAction SilentlyContinue) {
            # macOS
            brew install k6
        }
        else {
            Write-ColorOutput "Package manager not found. Please install k6 manually." $Yellow
            exit 1
        }
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

function Run-PerformanceTest {
    Write-ColorOutput "Starting performance tests..." $Blue
    Write-ColorOutput "Base URL: $BaseUrl" $Blue
    Write-ColorOutput "Test Duration: $TestDuration seconds" $Blue
    
    $testScript = Join-Path $PSScriptRoot "k6-login-burst-test.js"
    
    if (-not (Test-Path $testScript)) {
        Write-ColorOutput "✗ Test script not found: $testScript" $Red
        exit 1
    }
    
    # Set environment variables for k6
    $env:BASE_URL = $BaseUrl
    
    # Run k6 test
    Write-ColorOutput "Running k6 performance test..." $Blue
    Write-ColorOutput "Command: $K6Path run --out json=results.json --duration ${TestDuration}s $testScript" $Blue
    
    try {
        & $K6Path run --out json=results.json --duration "${TestDuration}s" $testScript
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✓ Performance test completed successfully" $Green
            return $true
        }
        else {
            Write-ColorOutput "✗ Performance test failed with exit code: $LASTEXITCODE" $Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "✗ Performance test failed: $($_.Exception.Message)" $Red
        return $false
    }
}

function Analyze-Results {
    Write-ColorOutput "Analyzing test results..." $Blue
    
    $resultsFile = "results.json"
    if (-not (Test-Path $resultsFile)) {
        Write-ColorOutput "✗ Results file not found: $resultsFile" $Red
        return $false
    }
    
    try {
        $results = Get-Content $resultsFile | ConvertFrom-Json
        
        # Extract key metrics
        $metrics = $results.metrics
        
        Write-ColorOutput "`n=== PERFORMANCE TEST RESULTS ===" $Blue
        Write-ColorOutput "Total Requests: $($metrics.http_reqs.values.count)" $Blue
        Write-ColorOutput "Failed Requests: $($metrics.http_req_failed.values.rate)" $Blue
        Write-ColorOutput "Average Response Time: $([math]::Round($metrics.http_req_duration.values.avg, 2))ms" $Blue
        Write-ColorOutput "P95 Response Time: $([math]::Round($metrics.http_req_duration.values['p(95)'], 2))ms" $Blue
        Write-ColorOutput "P99 Response Time: $([math]::Round($metrics.http_req_duration.values['p(99)'], 2))ms" $Blue
        
        # Check performance budgets
        $p99Threshold = 120
        $p99Actual = $metrics.http_req_duration.values['p(99)']
        
        if ($p99Actual -le $p99Threshold) {
            Write-ColorOutput "✓ P99 response time ($p99Actual ms) meets budget ($p99Threshold ms)" $Green
        }
        else {
            Write-ColorOutput "✗ P99 response time ($p99Actual ms) exceeds budget ($p99Threshold ms)" $Red
        }
        
        # Check error rate
        $errorThreshold = 0.01
        $errorRate = $metrics.http_req_failed.values.rate
        
        if ($errorRate -le $errorThreshold) {
            Write-ColorOutput "✓ Error rate ($([math]::Round($errorRate * 100, 2))%) meets budget ($([math]::Round($errorThreshold * 100, 2))%)" $Green
        }
        else {
            Write-ColorOutput "✗ Error rate ($([math]::Round($errorRate * 100, 2))%) exceeds budget ($([math]::Round($errorThreshold * 100, 2))%)" $Red
        }
        
        return $true
    }
    catch {
        Write-ColorOutput "✗ Failed to analyze results: $($_.Exception.Message)" $Red
        return $false
    }
}

# Main execution
Write-ColorOutput "=== SAFAWINET API PERFORMANCE TEST RUNNER ===" $Blue
Write-ColorOutput "Starting performance validation..." $Blue

# Check if k6 is installed
if (-not (Test-K6Installed)) {
    if ($InstallK6) {
        Install-K6
    }
    else {
        Write-ColorOutput "✗ k6 not found. Use -InstallK6 to install it automatically." $Red
        Write-ColorOutput "Or install manually from: https://k6.io/docs/getting-started/installation/" $Yellow
        exit 1
    }
}

# Verify k6 installation
if (-not (Test-K6Installed)) {
    Write-ColorOutput "✗ k6 installation failed" $Red
    exit 1
}

Write-ColorOutput "✓ k6 is available" $Green

# Test API health
if (-not (Test-APIHealth)) {
    Write-ColorOutput "✗ Cannot proceed with performance tests - API is not healthy" $Red
    exit 1
}

# Run performance tests
if (Run-PerformanceTest) {
    # Analyze results
    if (Analyze-Results) {
        Write-ColorOutput "`n✓ Performance test suite completed successfully!" $Green
        exit 0
    }
    else {
        Write-ColorOutput "`n✗ Performance test analysis failed" $Red
        exit 1
    }
}
else {
    Write-ColorOutput "`n✗ Performance test execution failed" $Red
    exit 1
}

@echo off
REM Safawinet Development Commands for Windows
REM Usage: dev.bat <command>

if "%1"=="" (
    echo Usage: dev.bat ^<command^>
    echo.
    echo Available commands:
    echo   start     - Start full development environment
    echo   infra     - Start infrastructure services only
    echo   stop      - Stop infrastructure services
    echo   test      - Run all tests
    echo   perf      - Run performance tests
    echo   migrate   - Run database migrations
    echo   deploy    - Deploy migrations (staging/prod)
    exit /b 1
)

if "%1"=="start" (
    echo Starting development environment...
    docker compose up -d
    npm run prisma:generate
    npm run db:migrate
    npm run start:dev
) else if "%1"=="infra" (
    echo Starting infrastructure services...
    docker compose up -d
) else if "%1"=="stop" (
    echo Stopping infrastructure services...
    docker compose down
) else if "%1"=="test" (
    echo Running all tests...
    npm run test
    npm run test:e2e
) else if "%1"=="perf" (
    echo Running performance tests...
    k6 run tests/perf/login_burst.js
) else if "%1"=="migrate" (
    echo Running database migrations...
    npm run prisma:generate
    npm run db:migrate
) else if "%1"=="deploy" (
    echo Deploying database migrations (staging/prod)...
    npm run db:migrate:deploy
) else (
    echo Unknown command: %1
    echo Run 'dev.bat' without arguments for help
    exit /b 1
)

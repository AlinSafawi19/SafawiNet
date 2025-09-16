@echo off
echo ========================================
echo Safawinet Optimized Docker Build
echo ========================================

echo.
echo Step 1: Cleaning up Docker system...
docker system prune -f
docker volume prune -f

echo.
echo Step 2: Removing old images...
docker rmi safawinet-api 2>nul
docker rmi safawinet_api 2>nul

echo.
echo Step 3: Building with optimized multi-stage Dockerfile...
set DOCKER_BUILDKIT=1
docker compose build --no-cache --progress=plain api

echo.
echo Step 4: Starting services...
docker compose up -d

echo.
echo ========================================
echo Build completed! Check logs with:
echo docker compose logs -f api
echo ========================================

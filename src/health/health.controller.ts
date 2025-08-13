import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  readiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}

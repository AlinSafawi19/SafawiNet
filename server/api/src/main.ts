import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import pino from 'pino-http';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Request, Response } from 'express';

// Extended Request type for custom properties
type ExtendedRequest = Request & {
  requestId?: string;
  user?: {
    id: string;
  };
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable WebSockets
  app.useWebSocketAdapter(new IoAdapter(app));

  // Cookie parser middleware for HTTP-only cookies
  app.use(cookieParser());

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );

  // Enhanced CORS configuration
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-API-Key',
      'X-Client-Version',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Total-Count'],
    maxAge: 86400, // 24 hours
  });

  // Enhanced Pino HTTP logging with request ID and user ID
  app.use(
    pino({
      level: process.env.LOG_LEVEL || 'info',
      customLogLevel: (req: ExtendedRequest, res: Response): string => {
        if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 300 && res.statusCode < 400) return 'silent';
        return 'info';
      },
      customSuccessMessage: (req: ExtendedRequest, res: Response): string => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      customErrorMessage: (
        req: ExtendedRequest,
        res: Response,
        err: Error,
      ): string => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
      },
      customProps: (req: ExtendedRequest, res: Response) => {
        return {
          requestId: req.requestId,
          userId: req.user?.id,
          userAgent: req.get?.('User-Agent') || req.headers['user-agent'],
          ip: req.ip || req.connection?.remoteAddress,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
        };
      },
      serializers: {
        req: (req: ExtendedRequest) => ({
          id: req.requestId,
          method: req.method,
          url: req.url,
          headers: req.headers,
          remoteAddress: req.connection?.remoteAddress || req.ip,
          remotePort: req.connection?.remotePort,
        }),
        res: (res: Response) => ({
          statusCode: res.statusCode,
          headers: res.getHeaders ? res.getHeaders() : {},
        }),
      },
    }),
  );

  // Swagger configuration (dev only)
  if (process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Safawinet API')
      .setDescription('The Safawinet API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `📚 Swagger documentation available at: http://localhost:${port}/docs`,
    );
  }
}
void bootstrap();

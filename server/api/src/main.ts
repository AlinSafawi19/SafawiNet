import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import pino from 'pino-http';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser middleware for HTTP-only cookies
  app.use(cookieParser());

  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
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
  }));

  // Enhanced CORS configuration
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.enableCors({
    origin: (origin, callback) => {
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
  app.use(pino({
    level: process.env.LOG_LEVEL || 'info',
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 300 && res.statusCode < 400) return 'silent';
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
    customProps: (req, res) => {
      return {
        requestId: (req as any).requestId,
        userId: (req as any).user?.id,
        userAgent: (req as any).get?.('User-Agent') || req.headers['user-agent'],
        ip: (req as any).ip || req.connection?.remoteAddress,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
      };
    },
    serializers: {
      req: (req) => ({
        id: (req as any).requestId,
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.connection?.remoteAddress || (req as any).ip,
        remotePort: req.connection?.remotePort,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.getHeaders ? res.getHeaders() : {},
      }),
    },
  }));

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
    console.log(`📚 Swagger documentation available at: http://localhost:${port}/docs`);
  }
}
bootstrap();

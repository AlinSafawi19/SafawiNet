import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorDetails = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
      };
    }

    // Extract request information
    const requestId = (request as any).requestId;
    const userId = (request as any).user?.id;
    const ipAddress = request.ip || request.connection.remoteAddress;
    const userAgent = request.get('User-Agent');

    // Log the error with full context
    console.error(`HTTP ${status} Error: ${message}`, {
      userId,
      requestId,
      url: request.url,
      userAgent,
      ipAddress,
      source: 'api',
      statusCode: status,
      errorDetails,
      body: request.body,
      query: request.query,
      params: request.params,
      method: request.method,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Send response
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      ...(process.env.NODE_ENV === 'development' && {
        error: errorDetails,
      }),
    });
  }
}

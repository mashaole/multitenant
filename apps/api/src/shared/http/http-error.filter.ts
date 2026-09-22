import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ILogger, LOGGER } from '../ports/logger.port';
import { Inject } from '@nestjs/common';
import { AppError, ERROR_CODES } from './error-codes';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof AppError) {
      res.status(exception.status).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (status === 400 || status === 422) {
        const details = this.fieldDetails(body);
        res.status(422).json({
          error: {
            code: ERROR_CODES.VALIDATION_FAILED,
            message: 'Request validation failed',
            details,
          },
        });
        return;
      }
      if (status === 404) {
        res.status(404).json({
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Not found' },
        });
        return;
      }
      if (status === 429) {
        res.status(429).json({
          error: {
            code: ERROR_CODES.RATE_LIMITED,
            message: 'Too many requests',
          },
        });
        return;
      }
      if (status === 405) {
        res.status(405).json({
          error: {
            code: ERROR_CODES.METHOD_NOT_ALLOWED,
            message: 'Method not allowed',
          },
        });
        return;
      }
    }
    this.logger.error('Unhandled error', {
      name: exception instanceof Error ? exception.name : 'unknown',
    });
    res.status(500).json({
      error: { code: ERROR_CODES.INTERNAL, message: 'Something went wrong' },
    });
  }

  private fieldDetails(body: unknown): Array<{ field: string; message: string }> {
    if (typeof body === 'object' && body && 'message' in body) {
      const msg = (body as { message: unknown }).message;
      if (Array.isArray(msg)) {
        return msg.map((item) => {
          const text = String(item);
          const field = text.split(' ')[0] ?? 'value';
          return { field, message: text };
        });
      }
    }
    return [];
  }
}

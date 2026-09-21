import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES } from './error-codes';

const ALLOWED = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

@Injectable()
export class MethodAllowlistMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!ALLOWED.has(req.method)) {
      res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      throw new AppError(
        ERROR_CODES.METHOD_NOT_ALLOWED,
        `Method ${req.method} is not allowed`,
        405,
      );
    }
    next();
  }
}

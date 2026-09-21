import { Injectable } from '@nestjs/common';
import { ILogger } from '../ports/logger.port';

@Injectable()
export class ConsoleLoggerAdapter implements ILogger {
  info(message: string, meta?: Record<string, unknown>): void {
    console.info(JSON.stringify({ level: 'info', message, ...meta }));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta }));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify({ level: 'error', message, ...meta }));
  }
}

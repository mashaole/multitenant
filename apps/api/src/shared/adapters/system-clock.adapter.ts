import { Injectable } from '@nestjs/common';
import { IClock } from '../ports/clock.port';

@Injectable()
export class SystemClockAdapter implements IClock {
  now(): Date {
    return new Date();
  }
}

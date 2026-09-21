import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ITokenHasher } from '../ports/token-hasher.port';

@Injectable()
export class Sha256HasherAdapter implements ITokenHasher {
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

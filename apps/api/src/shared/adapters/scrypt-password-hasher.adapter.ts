import { Injectable } from '@nestjs/common';
import { IPasswordHasher } from '../ports/password-hasher.port';
import { hashPassword, verifyPassword } from '../crypto/password-hash';

@Injectable()
export class ScryptPasswordHasherAdapter implements IPasswordHasher {
  hash(plain: string) {
    return hashPassword(plain);
  }

  verify(plain: string, stored: string) {
    return verifyPassword(plain, stored);
  }
}

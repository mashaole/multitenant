import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

const KEY_LEN = 32;
const N = 16384;
const PREFIX = 'scrypt';

function deriveKey(plain: string, salt: Buffer, keyLen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plain, salt, keyLen, { N }, (err, derived) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derived);
    });
  });
}

/** Time: O(scrypt) | Space: O(1) */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(plain, salt, KEY_LEN);
  return `${PREFIX}:${salt.toString('hex')}:${key.toString('hex')}`;
}

/** Time: O(scrypt) | Space: O(1) */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    return false;
  }
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }
  const actual = await deriveKey(plain, salt, expected.length);
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

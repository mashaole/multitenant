import { hashPassword, verifyPassword } from './password-hash';

describe('password-hash', () => {
  it('accepts the original password and rejects another', async () => {
    const stored = await hashPassword('Pulse!dev1');
    expect(stored.startsWith('scrypt:')).toBe(true);
    expect(await verifyPassword('Pulse!dev1', stored)).toBe(true);
    expect(await verifyPassword('wrong', stored)).toBe(false);
    expect(await verifyPassword('Pulse!dev1', 'not-a-hash')).toBe(false);
  });
});

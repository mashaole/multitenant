import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AUTH_REPOSITORY, IAuthRepository } from './auth.repository';
import { CLOCK, IClock } from '../../shared/ports/clock.port';
import { TOKEN_SIGNER, ITokenSigner } from '../../shared/ports/token-signer.port';
import { TOKEN_HASHER, ITokenHasher } from '../../shared/ports/token-hasher.port';
import { PASSWORD_HASHER, IPasswordHasher } from '../../shared/ports/password-hasher.port';
import { ACTIVITY_EMITTER, IActivityEmitter } from '../../shared/ports/activity.port';
import { AppError, ERROR_CODES } from '../../shared/http/error-codes';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { hashPassword } from '../../shared/crypto/password-hash';

const TTL = Number(process.env.JWT_TTL_SECONDS ?? 86400);

let dummyHash: string | null = null;

async function unusedPasswordHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = await hashPassword('unused-timing-hash');
  }
  return dummyHash;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repo: IAuthRepository,
    @Inject(CLOCK) private readonly clock: IClock,
    @Inject(TOKEN_SIGNER) private readonly signer: ITokenSigner,
    @Inject(TOKEN_HASHER) private readonly hasher: ITokenHasher,
    @Inject(PASSWORD_HASHER) private readonly passwords: IPasswordHasher,
    @Inject(ACTIVITY_EMITTER) private readonly activity: IActivityEmitter,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: string, password: string, orgId?: string) {
    const matches = await this.repo.findActiveUsersByEmail(email, orgId);
    const user = matches.length === 1 ? matches[0] : null;
    const stored = user?.passwordHash || (await unusedPasswordHash());
    const ok = await this.passwords.verify(password, stored);
    if (!user || !ok) {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid credentials', 401);
    }
    const permissions = user.role.perms.map((p) => p.permission.key);
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + TTL * 1000);
    const jti = randomUUID();
    const token = this.signer.sign(
      {
        sub: user.id,
        orgId: user.orgId,
        roleId: user.roleId,
        roleName: user.role.name,
        permissions,
        jti,
      },
      expiresAt,
    );
    const tokenHash = this.hasher.hash(token);

    await this.prisma.$transaction(async (tx) => {
      const active = await tx.session.findMany({
        where: { userId: user.id, revokedAt: null, expiresAt: { gt: now } },
        orderBy: { createdAt: 'asc' },
      });
      const cap = user.org.maxSessionsPerUser;
      const overflow = active.length + 1 - cap;
      if (overflow > 0) {
        const evict = active.slice(0, overflow).map((s) => s.id);
        await tx.session.updateMany({
          where: { id: { in: evict } },
          data: { revokedAt: now },
        });
      }
      await tx.session.create({
        data: {
          id: jti,
          userId: user.id,
          orgId: user.orgId,
          tokenHash,
          expiresAt,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { lastLogin: now },
      });
    });

    this.activity.emit({
      orgId: user.orgId,
      userId: user.id,
      group: 'auth',
      action: 'auth.login',
      metadata: { entityType: 'session', entityId: jti, name: user.name },
    });

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleName: user.role.name,
        permissions,
      },
      org: { id: user.org.id, name: user.org.name },
    };
  }

  async logout(jti: string, orgId: string, userId: string) {
    const result = await this.repo.revokeSession(jti, this.clock.now());
    if (!result.already) {
      this.activity.emit({
        orgId,
        userId,
        group: 'auth',
        action: 'auth.logout',
        metadata: { entityType: 'session', entityId: jti, name: 'logout' },
      });
    }
    return { ok: true };
  }
}

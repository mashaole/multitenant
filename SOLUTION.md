# Solution notes

## Week definition

**ISO calendar week, Monday start.** A unique `(surveyId, userId, weekStart)` constraint makes a second response for the same week impossible at the database, not only in application code.

## Isolation

Hybrid: application `orgId` (JWT + Prisma extension) and PostgreSQL RLS on `pulse_app`.

- Org policy on every tenant table: `org_id = current_org` (fail-closed if unset).
- User policy on responses, answers, sessions, activity: org match and (`user_id = current_user` or `is_org_reader`).
- `is_org_reader` is derived from permissions so SUPER_ADMIN, ADMIN, and MANAGER are not blocked from summary, user delete, or session revoke.
- Cross-tenant admin uses the privileged client.

## Auth

JWT (HS256) carries `sub`, `orgId`, `roleId`, `roleName`, `permissions`, `jti`. The `Session` table stores `jti`, `tokenHash` (sha256 of the JWT), `expiresAt`, `revokedAt`. Verify signature locally, then one `jti` lookup.

`Organization.maxSessionsPerUser` defaults to **1** (1–20). Login evicts the oldest session when at cap. `User.lastLogin` is updated in the same transaction.

Permission changes apply on the next login (JWT is a snapshot).

## ACID

`withTenant` is one interactive transaction for business rows. Throw rolls back. Repositories receive the `tx` client and do not nest transactions.

Activity is **not** in that transaction. After commit the service calls `IActivityEmitter.emit` and does not await persist. An in-process queue drains with `setImmediate`. A crash between commit and drain can drop one log.

## Ports

Services depend on `ILogger`, `ITokenSigner`, `ITokenHasher`, `IClock`, `IActivityEmitter`, and domain repositories. Nest singleton adapters bind the concrete Prisma / JWT / console implementations.

## Known gaps / next steps

- No survey edit/deactivate endpoint (create + `isActive` on create only).
- No org soft-delete.
- JWT permission snapshot until re-login; add refresh or short TTL.
- Activity outbox / SQS if the process must not drop a log.
- OIDC instead of demo login.
- Schema-per-tenant only if an enterprise tier needs it.

## AWS (design only)

- API: ECS Fargate behind an ALB.
- Database: RDS PostgreSQL Multi-AZ.
- Web: S3 + CloudFront.
- Org logos: browser uploads with a **pre-signed S3 PUT**. The API only signs; it never proxies bytes. Reads use CloudFront signed URLs. That keeps backend bandwidth and cost down and keeps objects off the public internet.
- First hardening: OIDC, Secrets Manager, WAF, JWT signer via KMS/RS256, read replicas for summary/activity.

## Threat model (STRIDE-lite)

- Assets: JWTs, session hashes, tenant survey/response data, role grants, audit trail.
- Threats: replayed JWT, `alg=none`, privilege escalation via custom roles, secrets in logs/errors, cross-tenant or cross-user reads, verb smuggling.
- Mitigations: hashed tokens, revoke/expiry/org cap, token then permission middleware, method allowlist, DTO whitelist, error filter, activity allowlist, soft-delete + session revoke, RLS + app `orgId`.
- Residual: demo JWT secret is local-only; async activity can drop one row on crash.

## AI workflow

Built in Cursor. Task setup: written SPEC and AGENTS.md first (this file). Work was split: scaffold → schema/RLS → kernel → domains → tests → UI → Postman.

Delegated to the agent: boilerplate, Prisma schema, Nest modules, React pages. Kept for human review: isolation rules, RLS vs RBAC, session cap, error envelope, what not to log.

### Validation

_(Appended after implementation.)_

# Agent instructions

This repository is a multi-tenant pulse survey slice. Follow these constraints on every change. Sequence and coverage: [PLAN.md](PLAN.md). Frozen contract: [SPEC.md](SPEC.md).

## Isolation

- Every tenant query must include `orgId` from the verified JWT.
- Member-owned reads/writes also filter `userId = jwt.sub`.
- Tenant business writes go through `withTenant` (one Postgres transaction + `set_config`).
- Do not query as the owner role for tenant traffic. Privileged client is only for login lookup, seed, migrations, system-admin cross-org CRUD, and async activity inserts.
- RLS is fail-closed. Do not weaken policies to "make a test pass".

## Layers

- Controllers never call repositories.
- Services never import Prisma, `jsonwebtoken`, or `console`.
- Repositories implement ports. Adapters are the only files that import Prisma / jsonwebtoken / console.
- Domains must not import each other's internals. Shared code lives in `apps/api/src/shared/`.

## HTTP

- Public routes only: `POST /auth/login`, `GET /health`.
- Protected routes: token middleware, then permission middleware.
- Rate-limit every route except OPTIONS (global per-IP window; tighter window on `POST /auth/login`). 429 `{ error: { code: RATE_LIMITED, message } }`.
- Never use `@All()`. Allowed methods: GET, POST, PUT, PATCH, DELETE (+ OPTIONS).
- Errors always `{ error: { code, message, details? } }`. Never leak stack, SQL, tokens, or env.

## Data

- Parameterized Prisma only. No concatenated `$queryRaw`.
- Soft-delete users (`deletedAt`). Never `DELETE FROM users`.
- Activity metadata allowlist: `{ entityType, entityId, name }` only.
- Emit activity after commit. Do not await persist on the request path.

## Tests

- Service unit tests bind in-memory fakes of ports.
- e2e must cover cross-org isolation, member-to-member isolation, RBAC, module gates, idempotency, 405, 422, 429.

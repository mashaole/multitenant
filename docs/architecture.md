# Architecture

## Modular monolith

`apps/api` is one NestJS process. Domains live under `src/domains/` and share a kernel under `src/shared/`. A domain can later move to `apps/<name>-service` without rewriting business logic: keep the port, swap the transport.

## Layers (per domain)

```
controller → service → repository port → Prisma adapter
```

- Controllers: HTTP only.
- Services: business rules, unit-tested against fake repositories.
- Ports: interfaces (`ISurveysRepository`, `ILogger`, `ITokenSigner`, `ITokenHasher`, `IPasswordHasher`, `IClock`, `IActivityEmitter`).
- Adapters: Nest singleton providers. Only adapters import Prisma, `jsonwebtoken`, or `console`.

## Shared kernel

- `shared/prisma` — owner client + `pulse_app` client.
- `shared/tenant` — `withTenant` (`set_config` + interactive transaction).
- `shared/http` — method allowlist, rate limit, token then permission middleware, error filter.
- `shared/access-control` — `@RequiresPermission`, module map, superset util.
- `shared/activity` — async emitter (after commit, not awaited).

## Isolation

1. App: tenant queries add `orgId` from the JWT. Identity is `users.id`, not email. Login is email + password + organization **name** (always required). Active email uniqueness is `(orgId, lower(email))` so two orgs can share an address as two accounts. Organization names are unique on `lower(name)`.
2. RLS (SQL): org match on every tenant table. User-owned tables (sessions, responses, answers, activity) also require `user_id = current_user` **or** `app.is_org_reader = true`.
3. Policies never mention role names. `withTenant` sets three transaction-local GUCs: `app.current_org_id`, `app.current_user_id`, `app.is_org_reader`. Dropping ADMIN did not change SQL.

`is_org_reader` is computed in the app from permissions (`ORG_READER_PERMS`). MANAGER qualifies via `summary:read` / `users:create` / `orgs:update`. SUPER_ADMIN qualifies via `orgs:create`. MEMBER does not. Custom roles become readers only if they are granted one of those keys.

Custom roles are created with `orgId = JWT org`. `GET /roles`, `DELETE /roles/:id`, and `POST /users` reject a custom role whose `orgId` is not the target organization. System roles stay global (`orgId` null) and cannot be deleted. RLS on `roles` is `orgId IS NULL OR orgId = current_org`.

Cross-tenant org create / list / module grant uses the privileged client (bypasses RLS) plus `orgs:create` / `modules:manage`. That path never asked RLS to see every org at once.

## Extraction recipe

1. Move `src/domains/<name>` to `apps/<name>-service`.
2. Keep DTOs as the wire contract.
3. Replace in-process calls with a client behind the same port.
4. Promote `src/shared` to `packages/shared` when a second service appears.

Local: no broker — `IActivityEmitter` drains in-process. AWS design: the same port produces to SQS; ECS Fargate workers consume activity writes and weekly email digests. See [flows.md](flows.md).

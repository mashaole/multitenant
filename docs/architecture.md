# Architecture

## Modular monolith

`apps/api` is one NestJS process. Domains live under `src/domains/` and share a kernel under `src/shared/`. A domain can later move to `apps/<name>-service` without rewriting business logic: keep the port, swap the transport.

## Layers (per domain)

```
controller → service → repository port → Prisma adapter
```

- Controllers: HTTP only.
- Services: business rules, unit-tested against fake repositories.
- Ports: interfaces (`ISurveysRepository`, `ILogger`, `ITokenSigner`, `ITokenHasher`, `IClock`, `IActivityEmitter`).
- Adapters: Nest singleton providers. Only adapters import Prisma, `jsonwebtoken`, or `console`.

## Shared kernel

- `shared/prisma` — owner client + `pulse_app` client.
- `shared/tenant` — `withTenant` (`set_config` + interactive transaction).
- `shared/http` — method allowlist, token then permission middleware, error filter.
- `shared/access-control` — `@RequiresPermission`, module map, superset util.
- `shared/activity` — async emitter (after commit, not awaited).

## Isolation

1. App: Prisma extension injects `orgId`.
2. RLS: `org_id = current_org` on every tenant table.
3. User-owned tables also require `user_id = current_user` unless `is_org_reader` (derived from permissions, not role names).

Cross-tenant admin uses the privileged client and permission middleware.

## Extraction recipe

1. Move `src/domains/<name>` to `apps/<name>-service`.
2. Keep DTOs as the wire contract.
3. Replace in-process calls with a client behind the same port.
4. Promote `src/shared` to `packages/shared` when a second service appears.

Do not add a broker until traffic requires it.

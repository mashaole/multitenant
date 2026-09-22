# Pulse surveys — specification

Frozen before implementation. Code follows this contract.

## Actors

| Actor | Org | Typical permissions |
|---|---|---|
| SUPER_ADMIN | System | all — create orgs, grant modules, add managers |
| MANAGER | Tenant | surveys, responses:submit, summary, activity, roles, users:create/delete (including members and other managers), orgs:update |
| MEMBER | Tenant | responses:submit, surveys:read |
| Custom role | Tenant | subset of the actor's permissions |

A user belongs to exactly one organization. The same email may exist in another organization as a different user (separate `id`, sessions, and data). Active emails are unique per organization.

## Invariants

1. Data from one organization is never visible to another (app `orgId` + RLS). Custom roles (`roles.orgId` set) can be listed and assigned only in the organization that created them. System roles (`orgId` null) remain global.
2. A member cannot read another member's responses, answers, sessions, or activity (`userId` + RLS). SUPER_ADMIN / MANAGER are not blocked: `is_org_reader` is true when their permission set intersects `{ summary:read, activity:read, users:create, users:delete, orgs:update, orgs:create, modules:manage }`.
3. One response per member per survey per ISO week (Monday start). Unique `(surveyId, userId, weekStart)`.
4. At most three questions per survey. Types: `RATING` (1–5) and `YES_NO`.
5. Users are soft-deleted (`deletedAt`). Responses and activity keep `userId`. Active `(orgId, email)` is unique; a soft-deleted address may be reused in that org.
6. Sessions: JWT + `Session` row (`jti`, hash, expiry, revoke). Org `maxSessionsPerUser` default **1**, range 1–20.
7. You cannot grant permissions you do not have (superset guard).
8. Disabled org module → 403 `FORBIDDEN_MODULE`.
9. Activity metadata allowlist `{ entityType, entityId, name }` only. Emit after commit; do not block the request.
10. Multi-write business operations run in one transaction. Throw rolls back. Activity is not in that transaction.
11. SQL is parameterized only.
12. HTTP methods are explicit. Unknown verbs → 405. Invalid schema → 422. Errors: `{ error: { code, message, details? } }` with no internals.

## Error codes

`METHOD_NOT_ALLOWED`, `AUTH_UNAUTHORIZED`, `AUTH_TOKEN_EXPIRED`, `AUTH_TOKEN_REVOKED`, `FORBIDDEN_PERMISSION`, `FORBIDDEN_MODULE`, `NOT_FOUND`, `CONFLICT_DUPLICATE`, `VALIDATION_FAILED`, `INTERNAL`.

## API

Public (no token): `POST /auth/login`, `GET /auth/users`, `GET /health`.

Protected (token then permission):

| Method | Path | Permission |
|---|---|---|
| POST | /auth/logout | authenticated |
| GET | /permissions | authenticated |
| GET | /roles | roles:read |
| POST | /roles | roles:create |
| POST | /orgs | orgs:create |
| GET | /orgs | orgs:create |
| PUT | /orgs/:id/modules | modules:manage |
| PATCH | /orgs/:id/settings | orgs:update |
| POST | /users | users:create |
| GET | /users | users:create |
| DELETE | /users/:id | users:delete |
| GET | /surveys/active | surveys:read |
| POST | /surveys | surveys:create |
| GET | /surveys | surveys:read |
| POST | /surveys/:id/responses | responses:submit |
| GET | /surveys/:id/summary | summary:read + summary module |
| GET | /activity | activity:read + activity module |

List endpoints return `{ items, page, limit, total }`. Query `page` (min 1, default 1) and `limit` (1–100, default 20).

`POST /auth/login` `{ userId }` → `{ token, expiresAt, user, org }`.

`POST /surveys` `{ title, questions: [{ text, type, position }] }` max 3 questions.

`POST /surveys/:id/responses` `{ answers: [{ questionId, ratingValue?, yesNoValue? }] }`. Same week + same answers → 200 existing. Same week + different answers → 409.

`GET /surveys/:id/summary?week=` → `{ weekStart, completionCount, memberCount, completionRate, questions: [...] }`. Rate = completionCount / active members.

`PATCH /orgs/:id/settings` `{ maxSessionsPerUser }` 1–20. Manager: own org only.

## Ports

`ILogger`, `ITokenSigner`, `ITokenHasher`, `IClock`, `IActivityEmitter`, `I<Domain>Repository`.

## Seed

- System org: super admin, cap 1.
- Org A (Northwind Retail): manager, 2 members, custom role Team Lead (`summary:read`), all modules, cap 1.
- Org B (Apex Mining): manager, 2 members, **no summary module**, cap 1.
- One active survey per tenant org plus sample current-week responses.

## ERD

See [docs/flows.md](docs/flows.md) and the schema in `apps/api/prisma/schema.prisma`. Entities: Organization, User, Session, Role, Permission, RolePermission, Module, OrgModule, Survey, Question, Response, Answer, ActivityLog.

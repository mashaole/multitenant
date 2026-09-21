# AI log — 2026-09-21

Tool: Cursor agent. SPEC.md and AGENTS.md existed before domain code (P0).

## Prompts / task split

1. Scaffold + markdown (already committed).
2. Prisma schema, RLS, seed.
3. Kernel: ports, JWT+session, method allowlist, token then permission, withTenant, async activity.
4. Domains: access, admin, surveys, responses, summary, activity.
5. API unit + e2e.
6. React Router + AuthContext + ErrorBoundaries.
7. Postman/Newman + browser walkthrough.
8. This log + SOLUTION validation notes.

## Kept for human review

Isolation (app `orgId` + RLS + `is_org_reader` from permissions), session cap default 1, error envelope, activity allowlist, no secrets in logs.

## Checks

- `npm test` — 9 passed
- `npm run test:e2e` — 15 passed
- `npm run test:postman` — 0 failed
- Browser: member submit, manager summary, Apex module denied stays on page, super-admin orgs

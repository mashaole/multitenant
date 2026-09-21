# Pulse — multi-tenant weekly surveys

Organizations collect a short weekly pulse (rating and yes/no). Managers see completion and rollups. Tenant data is isolated at the application layer and with PostgreSQL RLS.

## Requirements

- Node.js 20+
- Docker (PostgreSQL 16)
- npm 10+

## Start

```bash
git clone <this-repo>
cd <repo>
npm install
npm run setup
npm run dev
```

- API: http://localhost:3001
- Web: http://localhost:5173
- Health: http://localhost:3001/health

`npm run setup` starts Postgres, runs migrations, and seeds data.

## Seeded users

Pick a user on `/login`. Default session cap is **1** per org (a second login as the same user revokes the first JWT).

| Name | Role | Org | Notes |
|---|---|---|---|
| Ava Stone | SUPER_ADMIN | System | Create orgs, grant modules |
| Ben Holt | ADMIN | System | Add managers to orgs |
| Maya Chen | MANAGER | Northwind Retail | Surveys, summary, roles, settings |
| Liam Park | MEMBER | Northwind Retail | Submit pulse |
| Nora Vale | MEMBER | Northwind Retail | Submit pulse |
| Jordan Reed | Team Lead | Northwind Retail | Custom role with `summary:read` |
| Priya Shah | MANAGER | Apex Mining | No summary module |
| Owen Brooks | MEMBER | Apex Mining | Submit pulse |
| Elise Ng | MEMBER | Apex Mining | Submit pulse |

## Demo checklist

1. Log in as Liam (Northwind member) → `/survey` → submit.
2. Log in as Maya (Northwind manager) → `/summary` — count moved.
3. Log in as Priya (Apex manager) → `/summary` — module denied, page stays up.
4. As Maya → `/roles` create a custom role from grouped permissions.
5. As Maya → `/activity` filter by group.
6. As Maya → `/settings` raise session cap.
7. Log in as Liam twice — first JWT is revoked (cap 1 until you raise it).
8. Log in as Ava → `/admin/orgs` create an org and toggle modules.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | API + web |
| `npm run setup` | Docker Postgres, migrate, seed |
| `npm test` | API unit tests |
| `npm run test:e2e` | API e2e (needs `pulse_test`) |
| `npm run test:postman` | Newman collection |

Import `postman/pulse.postman_collection.json` with `postman/local.postman_environment.json`.

## Docs

- [SPEC.md](SPEC.md) — contract
- [SOLUTION.md](SOLUTION.md) — decisions, AWS note, AI workflow
- [docs/architecture.md](docs/architecture.md)
- [docs/flows.md](docs/flows.md)
- [AGENTS.md](AGENTS.md) — agent constraints

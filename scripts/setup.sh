#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Copying env files"
if [ ! -f apps/api/.env ]; then
  cp .env.example apps/api/.env
fi
if [ ! -f apps/web/.env ]; then
  printf 'VITE_API_URL=http://localhost:3001\n' > apps/web/.env
fi

echo "==> Starting PostgreSQL"
docker compose up -d --wait

echo "==> Generating Prisma client and applying migrations"
npm run prisma:generate -w api
npm run prisma:migrate:deploy -w api

echo "==> Granting pulse_app on pulse_test"
docker compose exec -T postgres psql -U pulse -d postgres -c \
  "GRANT CONNECT ON DATABASE pulse_test TO pulse_app;" || true

echo "==> Seeding"
npm run prisma:seed -w api

echo "==> Ready. Run: npm run dev"
echo "    API  http://localhost:3001"
echo "    Web  http://localhost:5173"

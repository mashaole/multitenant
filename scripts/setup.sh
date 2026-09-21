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
npm run prisma:migrate -w api -- --name init --skip-seed || npm run prisma:migrate:deploy -w api

echo "==> Seeding"
npm run prisma:seed -w api

echo "==> Ready. Run: npm run dev"
echo "    API  http://localhost:3001"
echo "    Web  http://localhost:5173"

-- Runs once on first volume init.
CREATE DATABASE pulse_test;

-- App runtime role is created by the Prisma RLS migration (idempotent).
-- Privileged owner remains `pulse` for migrations and seed.

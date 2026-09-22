-- Password hashes are required for email+password login. Re-seed after apply.
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';

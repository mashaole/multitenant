-- Active emails are unique per organization, not globally.
-- Soft-deleted rows are excluded so the address can be reused in that org.
DROP INDEX IF EXISTS "users_email_active_key";
CREATE UNIQUE INDEX "users_org_email_active_key" ON "users"("orgId", "email") WHERE "deletedAt" IS NULL;

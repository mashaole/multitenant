-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('RATING', 'YES_NO');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "maxSessionsPerUser" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "organizations_max_sessions_check" CHECK ("maxSessionsPerUser" BETWEEN 1 AND 20)
);

CREATE TABLE "modules" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "modules_key_key" ON "modules"("key");

CREATE TABLE "org_modules" (
    "orgId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    CONSTRAINT "org_modules_pkey" PRIMARY KEY ("orgId","moduleId")
);

CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "orgId" UUID,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_orgId_name_key" ON "roles"("orgId","name");

CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,
    "lastLogin" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "users_orgId_idx" ON "users"("orgId");
CREATE UNIQUE INDEX "users_email_active_key" ON "users"("email") WHERE "deletedAt" IS NULL;

CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_userId_revokedAt_idx" ON "sessions"("userId","revokedAt");
CREATE INDEX "sessions_orgId_idx" ON "sessions"("orgId");

CREATE TABLE "surveys" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "surveys_orgId_isActive_idx" ON "surveys"("orgId","isActive");

CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "responses" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "weekStart" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "responses_surveyId_userId_weekStart_key" ON "responses"("surveyId","userId","weekStart");
CREATE INDEX "responses_surveyId_weekStart_idx" ON "responses"("surveyId","weekStart");
CREATE INDEX "responses_orgId_idx" ON "responses"("orgId");

CREATE TABLE "answers" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "responseId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "ratingValue" INTEGER,
    "yesNoValue" BOOLEAN,
    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "group" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "activity_logs_orgId_group_createdAt_idx" ON "activity_logs"("orgId","group","createdAt");

ALTER TABLE "org_modules" ADD CONSTRAINT "org_modules_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "org_modules" ADD CONSTRAINT "org_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "responses" ADD CONSTRAINT "responses_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "responses" ADD CONSTRAINT "responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "responses" ADD CONSTRAINT "responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- App role (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pulse_app') THEN
    CREATE ROLE pulse_app LOGIN PASSWORD 'pulse_app';
  END IF;
END $$;

GRANT CONNECT ON DATABASE pulse TO pulse_app;
GRANT USAGE ON SCHEMA public TO pulse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pulse_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulse_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pulse_app;

-- RLS
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "org_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_modules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "surveys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "surveys" FORCE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "responses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "answers" FORCE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON "organizations"
  USING (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation ON "org_modules"
  USING ("orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation ON "roles"
  USING ("orgId" IS NULL OR "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("orgId" IS NULL OR "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation ON "users"
  USING ("orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation ON "surveys"
  USING ("orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation ON "questions"
  USING ("orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY user_owned ON "sessions"
  USING (
    "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      OR current_setting('app.is_org_reader', true) = 'true'
    )
  )
  WITH CHECK (
    "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      OR current_setting('app.is_org_reader', true) = 'true'
    )
  );

CREATE POLICY user_owned ON "responses"
  USING (
    "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      OR current_setting('app.is_org_reader', true) = 'true'
    )
  )
  WITH CHECK (
    "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      OR current_setting('app.is_org_reader', true) = 'true'
    )
  );

CREATE POLICY user_owned ON "answers"
  USING (
    "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    AND (
      current_setting('app.is_org_reader', true) = 'true'
      OR EXISTS (
        SELECT 1 FROM "responses" r
        WHERE r.id = "answers"."responseId"
          AND r."userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      )
    )
  )
  WITH CHECK (
    "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
  );

CREATE POLICY user_owned ON "activity_logs"
  USING (
    "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      OR current_setting('app.is_org_reader', true) = 'true'
    )
  )
  WITH CHECK (
    "orgId" = NULLIF(current_setting('app.current_org_id', true), '')::uuid
  );

GRANT SELECT ON "permissions" TO pulse_app;
GRANT SELECT ON "modules" TO pulse_app;
GRANT SELECT ON "role_permissions" TO pulse_app;

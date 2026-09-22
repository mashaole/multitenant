# Database ERD

Source of truth for columns and constraints: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).  
Generated SQL (tables, indexes, RLS): [`apps/api/prisma/migrations/`](../apps/api/prisma/migrations/).

Mermaid `erDiagram` blocks **render as diagrams on GitHub** (blob view / PRs) and in Cursor/VS Code markdown preview. They do not render in raw text or plain `git show`.

## Entity relationship diagram

```mermaid
erDiagram
  organizations ||--o{ users : "has"
  organizations ||--o{ roles : "owns"
  organizations ||--o{ org_modules : "enables"
  organizations ||--o{ surveys : "owns"
  organizations ||--o{ sessions : "scopes"
  organizations ||--o{ questions : "scopes"
  organizations ||--o{ responses : "scopes"
  organizations ||--o{ answers : "scopes"
  organizations ||--o{ activity_logs : "scopes"

  modules ||--o{ org_modules : "granted to"

  roles ||--o{ users : "assigned"
  roles ||--o{ role_permissions : "grants"
  permissions ||--o{ role_permissions : "used by"

  users ||--o{ sessions : "has"
  users ||--o{ responses : "submits"
  users ||--o{ activity_logs : "acts"

  surveys ||--o{ questions : "contains"
  surveys ||--o{ responses : "receives"

  responses ||--o{ answers : "has"
  questions ||--o{ answers : "answered by"

  organizations {
    uuid id PK
    text name UK
    boolean isSystem
    int maxSessionsPerUser
    timestamp createdAt
  }

  modules {
    uuid id PK
    text key UK
    text name
  }

  org_modules {
    uuid orgId PK_FK
    uuid moduleId PK_FK
  }

  permissions {
    uuid id PK
    text key UK
    text domain
    text description
  }

  roles {
    uuid id PK
    uuid orgId FK
    text name
    boolean isSystem
  }

  role_permissions {
    uuid roleId PK_FK
    uuid permissionId PK_FK
  }

  users {
    uuid id PK
    uuid orgId FK
    uuid roleId FK
    text name
    text email
    text passwordHash
    timestamp createdAt
    timestamp updatedAt
    uuid updatedBy
    timestamp lastLogin
    timestamp deletedAt
  }

  sessions {
    uuid id PK
    uuid userId FK
    uuid orgId FK
    text tokenHash UK
    timestamp expiresAt
    timestamp revokedAt
    timestamp createdAt
  }

  surveys {
    uuid id PK
    uuid orgId FK
    text title
    boolean isActive
    timestamp createdAt
  }

  questions {
    uuid id PK
    uuid orgId FK
    uuid surveyId FK
    text text
    QuestionType type
    int position
  }

  responses {
    uuid id PK
    uuid orgId FK
    uuid surveyId FK
    uuid userId FK
    date weekStart
    timestamp createdAt
  }

  answers {
    uuid id PK
    uuid orgId FK
    uuid responseId FK
    uuid questionId FK
    int ratingValue
    boolean yesNoValue
  }

  activity_logs {
    uuid id PK
    uuid orgId FK
    uuid userId FK
    text group
    text action
    json metadata
    timestamp createdAt
  }
```

## Notes

- `QuestionType` enum: `RATING` | `YES_NO`.
- Tenant isolation: almost every business row carries `orgId`; RLS uses session `set_config` (see `withTenant`).
- Soft-delete users via `deletedAt` — never hard-delete user rows.
- Unique among active users: `(orgId, lower(email))` where `deletedAt IS NULL`.
- One response per member per survey week: unique `(surveyId, userId, weekStart)`.

# Flows

Mermaid fenced blocks **render as diagrams on GitHub** when you open the file on github.com (blob view, PRs, and the rendered README). They also render in GitHub’s markdown preview and in most IDE previews (including Cursor/VS Code). They do **not** render in the raw text view, `git show`, or a plain clone without a Mermaid-aware viewer.

GitHub-safe shapes used here: `flowchart` and `sequenceDiagram`. Avoid click handlers and HTML inside nodes — GitHub strips those.

## AWS system design (design only)

Local run has no broker. On AWS the API stays a modular monolith; side effects leave the request path through SQS.

```mermaid
flowchart LR
  subgraph edge [Edge]
    Browser[Browser]
    CF[CloudFront plus S3 web]
    WAF[WAF]
    ALB[ALB]
  end
  subgraph compute [Compute]
    API[ECS API produce]
    ActW[Activity worker consume]
    DigW[Digest worker consume]
  end
  subgraph data [Data]
    RDS[(RDS primary)]
    Replica[(Read replica)]
    SQS[SQS]
    SES[SES]
    Logos[S3 logos]
  end
  Browser --> CF
  Browser -->|JWT| WAF --> ALB --> API
  Browser -->|presigned PUT| Logos
  CF -->|signed GET| Logos
  API --> RDS
  API -->|produce| SQS
  SQS --> ActW
  SQS --> DigW
  ActW --> RDS
  DigW --> Replica
  DigW --> SES
```

## Login and session cap

```mermaid
sequenceDiagram
  participant Web
  participant Auth
  participant DB
  Web->>Auth: POST /auth/login userId
  Auth->>DB: load user role permissions org
  Auth->>DB: revoke oldest sessions if at org cap
  Auth->>DB: insert Session hash plus lastLogin
  Auth-->>Web: JWT once
```

## Member submits a response

```mermaid
sequenceDiagram
  participant Web
  participant API
  participant DB
  Web->>API: POST /surveys/id/responses JWT
  API->>API: token then permission
  API->>DB: withTenant insert response plus answers
  API-->>Web: 200
  API->>DB: activity.emit after commit
```

Same week + same answers: 200 existing row, no second activity.
Same week + different answers: 409.

## Manager weekly summary

```mermaid
sequenceDiagram
  participant Web
  participant API
  participant DB
  Web->>API: GET /surveys/id/summary
  API->>API: summary:read plus summary module
  API->>DB: read tx snapshot
  API-->>Web: completion count rate plus rollups
```

## Cross-tenant denied

```mermaid
sequenceDiagram
  participant Web
  participant API
  Web->>API: OrgA JWT GET OrgB survey
  API-->>Web: 404 NOT_FOUND
```

## Soft-delete user

```mermaid
sequenceDiagram
  participant Web
  participant API
  participant DB
  Web->>API: DELETE /users/id
  API->>DB: set deletedAt revoke all sessions
  API-->>Web: 200
  Note over DB: responses and activity keep userId
```

## Produce and consume: activity plus email digest (AWS design)

After the business transaction commits, the API **produces** one small message and returns. Workers **consume**. The request never waits for persist or SES.

```mermaid
sequenceDiagram
  participant Web
  participant API
  participant DB
  participant SQS
  participant ActW as Activity worker
  participant DigW as Digest worker
  participant SES
  Web->>API: POST survey or admin write
  API->>DB: withTenant commit
  API->>SQS: produce allowlisted event
  API-->>Web: 200
  SQS->>ActW: consume
  ActW->>DB: insert ActivityLog
  Note over DigW: weekly EventBridge or digest.requested
  SQS->>DigW: consume
  DigW->>DB: read replica summary
  DigW->>SES: send manager digest
```

Payload allowlist is the same as today: `{ entityType, entityId, name }` plus `orgId`, `userId`, `group`, `action`. No tokens, hashes, or emails in the queue body. Digest mail is completion counts only — not another member’s answers.

```mermaid
flowchart TB
  Commit[Business COMMIT]
  Produce[API produce to SQS]
  Q[SQS]
  A[Activity consumer]
  D[Digest consumer]
  Log[ActivityLog insert]
  Mail[SES weekly digest]
  Commit --> Produce --> Q
  Q --> A --> Log
  Q --> D --> Mail
```

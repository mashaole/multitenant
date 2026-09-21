# Flows

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

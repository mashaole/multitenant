# AI log — 2026-09-21 (updated through browser hardening)

Tool: Cursor agent. SPEC.md and AGENTS.md existed before domain code (P0).

## Prompts / task split (agent)

1. Scaffold + markdown (already committed).
2. Prisma schema, RLS, seed.
3. Kernel: ports, JWT+session, method allowlist, token then permission, withTenant, async activity.
4. Domains: access, admin, surveys, responses, summary, activity.
5. API unit + e2e.
6. React Router + AuthContext + ErrorBoundaries.
7. Postman/Newman + initial browser walkthrough.
8. Follow-up fixes from human browser QA (active survey semantics, survey question form, module hide-from-DOM, summary charts, thank-you states, activity cross-org actors, `/auth/me` modules).
9. This log + SOLUTION validation / AI-workflow notes.

## Human (author)

- Initial requirements; **edited PLAN** when the agent’s assumptions and phase sequence needed correction or timeboxing.
- Accepted emergent requirements mid-build only when browser QA or necessity required them (kept the slice tight).
- Repeated **in-browser reviews** while testing as Ava, Maya, Priya, Liam, and Apex members.
- Compared each flow to expected functionality; reported mismatches until agent fixes matched the contract.

See [SOLUTION.md](../SOLUTION.md) § AI workflow and the note at the top of [PLAN.md](../PLAN.md).

## Checks

- `npm test` / `npm run test:e2e` / `npm run test:postman` — green on a seeded DB.
- Browser: continuous human walkthrough; not a one-shot agent checklist.

# Roadmap

Thought API is experimental research software for agent-mediated opinion markets. The roadmap is intentionally narrow so outside contributors can tell what work is likely to be reviewed.

## Current Priorities

- Clarify the Taker API and Maker API contracts through tests, docs, and OpenAPI updates.
- Improve local-first agent workflows where private context stays outside the central service.
- Strengthen privacy and safety boundaries around agent registration, profiles, provenance, consent, and deletion.
- Improve longform synthesis quality, traceability, and reviewer ergonomics without exposing private participant context.
- Keep local development, CI, and dependency maintenance reproducible for outside contributors.

## Near-Term Contributor Work

- Add focused tests for routes, validation, consent gates, deletion, and synthesis behavior.
- Improve examples that show how agents should respect `knowledge_source` and abstain when they lack enough context.
- Tighten documentation for setup, API use, security reporting, and experimental limitations.
- Reduce dependency audit findings while preserving Node 20 support and existing behavior.
- Improve database migration clarity for local development and test workflows.

## Out of Scope For Now

- Financial, betting, wagering, trading, or regulated decision workflows.
- Production hosting guarantees, service-level objectives, or managed operations.
- Collecting private prompts, local workspace data, customer records, or non-public datasets in the repository.
- Large platform rewrites that are not tied to a specific research or safety improvement.
- New governance structures that require undisclosed private channels or closed decision records.

## How Priorities Change

Open an issue for roadmap proposals that affect project direction. Include the research value, expected user or agent workflow, safety and privacy impact, and the smallest useful implementation path.

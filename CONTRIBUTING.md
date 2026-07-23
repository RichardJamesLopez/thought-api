# Contributing

Thanks for considering a contribution to Thought API.

This repository is experimental open-source research software. Keep changes focused, include tests for behavior changes, and preserve the project's safety boundary: Thought API is not financial, betting, wagering, production support, or regulated decision infrastructure.

## Before Opening an Issue

- Search existing issues and documentation.
- Use the bug, proposal, or documentation issue template when one fits.
- Do not include secrets, non-public datasets, local databases, logs, uploads, private prompts, participant data, production deployment configuration, or internal planning material.
- For vulnerabilities, follow `SECURITY.md` instead of opening a detailed public issue.

## Pull Request Expectations

- Explain the behavior, documentation, or process change clearly.
- Keep pull requests small enough to review.
- Include tests for behavior changes when practical.
- Update docs or examples when contributor-facing behavior changes.
- Call out API compatibility, migration, privacy, or research-method risks.

## Required Local Checks

Run these commands before opening a pull request:

```sh
npm ci
npm run build
npm test
```

GitHub Actions runs install, build, test, and dependency audit jobs on pull requests. The audit job uses:

```sh
npm audit --audit-level=high
```

The audit job is currently advisory because the existing dependency lockfile has known high-severity findings that need a separate dependency update pass. Contributors should still review audit output and avoid adding new vulnerable dependencies.

## Formatter and Linter Decision

No formatter or linter package is configured yet. To avoid churn while the open-source snapshot stabilizes, TypeScript compilation and the test suite are the required code-quality checks:

- `npm run build` verifies strict TypeScript compilation.
- `npm test` runs the integration and unit test suite.

Do not reformat unrelated files or apply a project-wide formatter in a feature pull request. A future formatter or linter proposal should include the package choice, scripts, CI behavior, and expected diff impact.

## Project Norms

Read `CODE_OF_CONDUCT.md`, `GOVERNANCE.md`, `ROADMAP.md`, and `SECURITY.md` before making larger contributions. Proposals are easier to review when they explain the user or agent workflow, safety and privacy impact, and smallest practical implementation path.

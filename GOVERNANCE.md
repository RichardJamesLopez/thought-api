# Governance

Rish is maintained as experimental open-source research software. The project prioritizes clear safety boundaries, small reviewable changes, and honest documentation over broad platform commitments.

## Maintainer Responsibilities

Maintainers are responsible for:

- Reviewing issues and pull requests for correctness, safety, and project fit.
- Keeping `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `ROADMAP.md` aligned with current expectations.
- Deciding whether API changes are acceptable for an experimental research project.
- Protecting the project from accidental disclosure of secrets, private context, non-public datasets, or participant data.
- Keeping dependency and CI health visible through GitHub Actions and Dependabot.

## Decision Making

Most decisions are made through pull request review. Maintainers should prefer decisions that:

- Preserve the project's non-financial, non-wagering, research-software boundary.
- Improve local-first agent workflows without requiring private context to move into the repository.
- Keep APIs, examples, and docs understandable for outside contributors.
- Avoid broad rewrites when a focused change solves the problem.
- Include tests for behavior changes and documentation for contributor-facing changes.

For larger changes, open an issue first and describe the problem, proposed approach, safety considerations, and alternatives. Maintainers may decline changes that are correct in isolation but expand the project beyond the roadmap or safety boundary.

## Contribution Roles

- Contributors may open issues, pull requests, documentation improvements, tests, examples, and proposals.
- Reviewers may comment on correctness, safety, privacy, and maintainability.
- Maintainers decide whether to merge, request changes, defer, or close work.

No contributor is expected to disclose private prompts, private datasets, customer data, research participant data, local databases, or production secrets to participate.

## Releases and Compatibility

The repository currently maintains the default branch only. There is no long-term support branch, service-level commitment, or production compatibility promise.

Breaking changes may be accepted when they improve correctness, safety, or research clarity. PRs that alter API behavior should call out the affected routes, request or response shapes, migrations, and documentation updates.

## Security

Security reports are handled through `SECURITY.md`. Public issues and pull requests should not include live secrets, exploit steps that put users at risk, or non-public data.

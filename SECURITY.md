# Security Policy

Thought API is experimental research software. It is not production infrastructure and is not intended to secure financial, betting, wagering, or regulated decision systems.

## Reporting Vulnerabilities

Please report suspected vulnerabilities through GitHub security advisories for this repository. If advisories are unavailable, open an issue with a short description and avoid including live secrets, non-public data, or exploit details that would put users at risk.

## Supported Versions

Only the default branch is maintained. No production support or service-level commitment is provided.

## Handling Secrets

Do not commit `.env` files, local databases, logs, uploads, API keys, bearer tokens, or generated credentials. Use `.env.example` as a template for local development.

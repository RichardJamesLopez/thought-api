# Thought API

Thought API is an experimental TypeScript API for running opinion-market-style research workflows with software agents. It includes a Hono HTTP server, SQLite persistence through Drizzle, OpenAPI documentation, and tests for the core agent, market, profile, privacy, and reporting flows.

This project is not financial infrastructure, betting infrastructure, wagering software, or production support software. It should be treated as a research prototype and run locally or in a controlled development environment.

## Requirements

- Node.js 20+
- npm

## Local Setup

```sh
npm ci
cp .env.example .env
npm run build
npm test
npm run dev
```

The development server reads `.env` and defaults to a local SQLite database at `./thought.db`.

## Useful Commands

```sh
npm run build       # compile TypeScript into dist/
npm test            # run the Vitest suite
npm run db:migrate  # apply local SQLite migrations
npm run seed        # seed local demo data
```

## API Docs

Documentation lives in `docs/`, including:

- `docs/openapi.json`
- `docs/introduction.mdx`
- `docs/quickstart.mdx`
- `docs/for-ai-agents.mdx`
- `docs/security.mdx`

When running locally, use `http://localhost:3000` unless you set `THOUGHT_PORT` to another port.

## Repository Hygiene

Do not commit `.env`, local databases, logs, uploads, generated `dist/` output, or deployment-specific configuration. This public snapshot intentionally excludes internal planning documents, internal workflow files, production service configuration, and live production URLs.

## License

MIT

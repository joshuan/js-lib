# @joshuan libraries

Shared, versioned infrastructure for the applications in the `joshuan` namespace.

The repository is an npm-workspaces monorepo. Runtime packages are deliberately small: product
domain models, Prisma schemas, controllers, and composition roots stay in the applications.

## Packages

- `@joshuan/config` — typed configuration loading and production policy checks.
- `@joshuan/http` — HTTP envelopes, validation, cookies, CSRF, headers, and Nest error mapping.
- `@joshuan/observability` — safe Pino request logs, request context, and audit events.
- `@joshuan/next-nest` — the shared Next/Nest/Express process bootstrap.
- `@joshuan/next-config` — runtime-safe Next.js defaults without test/lint dependencies.
- `@joshuan/auth-core` — framework-free authentication and server-side sessions.
- `@joshuan/auth-adapters` — Argon2, tokens, Turnstile, and email adapters.
- `@joshuan/testkit` — reusable conformance suites and test doubles.
- `@joshuan/tooling` — ESLint, TypeScript, SWC, and Vitest configuration presets.

## Commands

```sh
npm ci
npm run ci
```

Every publishable workspace is packed and installed into a clean fixture by `npm run pack:check`.

## Releasing

Changesets owns versions and changelogs. Merging the generated release pull request publishes
only new versions with npm provenance from the protected `npm` GitHub environment. The initial
versions have been bootstrapped in npm. Select this repository and workflow as the trusted
publisher for each package before relying on automated releases.

# ADR-001: package boundaries and extraction policy

Status: accepted, 2026-09-01.

## Context

`legere`, `rent-manage`, and `squadtab` use one Next/Nest/Express process and repeat HTTP,
authentication, logging, configuration, test, and build infrastructure. `documents-ui` and
`finance` are older Next Pages Router applications with duplicated file-backed password and
in-memory session implementations.

`legere` is the behavioural reference because its infrastructure has undergone two explicit
security reviews. It is a reference, not a source directory to copy wholesale.

## Decision

Shared packages own protocol and infrastructure behaviour. Applications retain product policy.

Packages may own:

- process/bootstrap ordering;
- HTTP envelopes and framework adapters;
- security headers, cookie and CSRF policy;
- request logging, correlation, and audit sinks;
- authentication primitives and framework-free flows behind repository ports;
- build/lint/test configuration and conformance tests.
- small runtime Next.js configuration shared without pulling tooling into production images.

Applications continue to own:

- `AppModule` and the composition root;
- Prisma schema, migrations, repositories, and mappers;
- product entities, API DTOs, roles, memberships, and authorization rules;
- product middleware such as raw document uploads or MCP dispatch;
- deployment topology and product-specific container contents.

## Extraction rule

1. Copy the behavioural tests or write a regression test before moving code.
2. Extract the smallest coherent contract.
3. Migrate `legere` first.
4. Validate the API with `rent-manage` and `squadtab` before declaring it stable.
5. Remove the local implementation only after application tests pass.

No package imports Prisma or a product contract. Framework dependencies whose identity matters to
DI are peer dependencies.

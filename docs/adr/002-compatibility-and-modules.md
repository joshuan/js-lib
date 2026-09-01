# ADR-002: runtime and module compatibility

Status: accepted, 2026-09-01.

## Decision

- Node.js 24 is the minimum supported runtime.
- CI tests Node.js 24 and 26.
- Runtime packages publish ESM, CommonJS, and declarations through explicit export maps.
- Next, Nest, Express, Pino, and other host frameworks are peer dependencies.
- Shared packages do not expose Prisma types.
- Validation accepts a structural `safeParse` schema where possible, avoiding an unnecessary
  coupling to one Zod major.

Applications may pin a narrower runtime. A package may narrow its peer range only after a fixture
proves that the wider range cannot be supported.

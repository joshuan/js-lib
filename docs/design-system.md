# Shared application design

Decision: 2026-10-01. Legere and Rent Manager are independent applications in one ecosystem.
Their common design belongs in `@joshuan/design-system`; business rules and navigation content
remain in each application. This is an application system, not a marketing site template.

## Design contract

The two existing designs already favour quiet workspaces, persistent navigation, explicit actions
and readable records. Preserve this direction. Use one neutral palette, one type scale and one
control scale. Green identifies the archive; blue identifies the apartment workspace. Status colours
have the same meaning in both products and always include a textual or iconic signal.

| Role           | Light     | Dark      |
| -------------- | --------- | --------- |
| Canvas         | `#F5F7F8` | `#121A1E` |
| Surface        | `#FFFFFF` | `#1A252B` |
| Raised surface | `#FFFFFF` | `#223139` |
| Text           | `#24323B` | `#E7EFF2` |
| Secondary text | `#5F7079` | `#A2B3BA` |
| Divider        | `#DEE5E8` | `#30434B` |

IBM Plex Sans is self-hosted by each Next application, with system sans fallback. IBM Plex Mono
is reserved for paths, hashes and code. Numbers use tabular figures. Body 14/21, page titles 24/31
(20/26 on phones), section titles 18/26. Controls 40 px, small 32 px, touch targets at least 44 px.
Radii: controls 6, surfaces 8, dialogs 12. Spacing: 4/8/12/16/20/24/32.
Navigation 240 px; archive compact rail 64 px. Page gutters 24/16/12, aligned to the left.
Forms retain a readable width. Document reading can use the full workspace.

```text
Desktop                           Phone
Product | Title        Action     Menu  Product
Routes  | Context / filters        Title
        |                         Action / filters
        | Records or document     Records or document
Account |                         at full width
```

One heading per screen, one primary action per scope, section grouping before cards. Shadows only
on overlays. Errors remain adjacent to the field; save failures retain input. Shared primitives
accept content, links and actions from the host: they do not know routes, translations or sessions.
System theme and reduced motion update live and have deterministic SSR snapshots. Ant Design
owns keyboard behaviour of controls; motion is disabled at the token as well as CSS level.

Review of the alternative: giving every app an identical blue dashboard would obscure context.
Keep product accents and domain navigation, while removing accidental differences in controls,
surfaces and heading composition. No new global header or speculative app launcher is needed.

## Package boundaries

- Root: framework-free palettes and dimensions.
- `/antd`: the common token/component configuration; Ant Design is a peer, not bundled.
- `/react`: `PageHeader` and system appearance hooks; React is a peer. No Next or next-intl imports.
- `/styles.css`: shared heading/layout rules and generated dimension variables; no product palette.
- Product adapters: locale, persistence of theme, auth hydration guards, routing and domain layouts.

Use the same Ant Design 6 and React 19 versions in both consumers. Legere moves to the current
Rent Manager UI stack in this change. Do not maintain adapters for Ant Design 5.
ESM, CommonJS and declaration exports must work from an installed tarball. CSS is a side effect;
the React entry retains its `use client` boundary. A package extraction must never require a
sibling checkout to build the application.

## Extraction audit

| Candidate                                                   | Evidence in both applications                                                                   | Decision                                                                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Design foundations, AntD theme, page heading, OS appearance | `web/shared/theme`, `shared/providers/theme-provider`, Rent `shared/ui/theme` and `page-layout` | Extract now; two real consumers                                                                                                   |
| Browser HTTP transport                                      | Legere `shared/api/client`, Rent `shared/api/http-client`                                       | Next: schema-parser callback rather than a Zod peer; keep error translation and 401 navigation in products                        |
| Hydration readiness                                         | `use-hydrated` / `use-client-ready`                                                             | Small candidate for React entry after lifecycle contract is aligned                                                               |
| S3 transport                                                | both `server/infrastructure/storage/s3-file-storage`                                            | Extract signing/streaming only after reconciling limits and cancellation; object ownership, MIME rules and retention remain local |
| Markdown presentation                                       | document text vs apartment notes                                                                | Share sanitisation only after comparing policies; archive images and external notes have different trust rules                    |
| OAuth consumer / delegated access                           | Legere issuer, Rent `entities/legere` and server integration                                    | Prefer a versioned Legere client contract once a second consumer exists; issuer and client are different roles                    |
| MCP transport                                               | both presentation layers                                                                        | Potential JSON-RPC/error/pagination helpers; do not share tool catalogues, scopes or mutation authorisation                       |
| Auth, config, HTTP server, logging, bootstrap, tooling      | both already use seven runtime `@joshuan/*` packages plus tooling                               | Reuse existing packages; do not re-extract wrappers that merely bind DI                                                           |
| Safe return navigation                                      | origin-based Legere parser vs path-only Rent parser                                             | Different accepted inputs and fallbacks; document a common policy before changing security behaviour                              |
| Prisma repositories, users, documents, apartments, money    | similar architecture, different semantics                                                       | Keep in products; similar folder names are not an abstraction                                                                     |

Prefer another export in an existing package when ownership fits. Create a new package only when
its dependency/lifecycle boundary is useful. No shared database, runtime monorepo or coordinated
application deployment is required.

## Ecosystem and identity

Today: Rent Manager already references Legere documents through per-user OAuth + PKCE and explicit
consent. Preserve UUID-based references, revocation and per-product access checks. Shared navigation
can eventually expose configured applications, but must not invent hostnames or imply shared login.

Proposal only: a separately operated passport could become an OpenID Connect provider. Apps would
keep local server sessions, map identities by `(issuer, subject)`, and retain local user settings,
apartment memberships and archive roles. Never merge users by email or share session cookies/database
tables. A login identity does not grant access to documents. OAuth access grants remain independent.
Use authorization code + PKCE, exact callback allowlists, issuer/audience/nonce validation and a
reviewed OIDC implementation. This is a separate product decision, not part of the visual migration.

Before implementing passport, decide ownership and recovery, self-hosted/offline operation, account
linking and unlinking, onboarding, outage handling and logout/revocation semantics. Build a migration
with rollback and explicit user linking before removing any password login. No identity changes now.

References: [Ant Design tokens](https://ant.design/docs/react/customize-theme/),
[OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html),
[OAuth Security BCP](https://www.rfc-editor.org/rfc/rfc9700.html).

## Delivery

1. Package and both host adapters; remove duplicated foundations and heading rules.
2. Type/lint/unit checks, computed contrast in both product accents, SSR/hydration and packed exports.
3. Canonical browser matrix for both applications; inspect screenshots before accepting baselines.
4. Publish through the existing Changesets process only when release is requested, then replace
   the temporary checked-in package tarball with the exact registry version in each application.

The pre-release tarball is built from this repository, never edited in a consumer. It is a deliberate
temporary distribution bridge so clean CI and Docker builds do not depend on a neighbour directory
or an unpublished npm version. Repack both consumers after a source change. Keep provenance and the
SHA-256 digest beside the tarball. Do not publish, deploy or claim production acceptance implicitly.

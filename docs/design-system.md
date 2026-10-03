# Shared application design

Decision: 2026-10-01. Legere and Rent Manager are independent applications in one ecosystem.
Their common design belongs in `@joshuan/design-system`; business rules and navigation content
remain in each application. This is an application system, not a marketing site template.

## Design contract

The two existing designs already favour quiet workspaces, persistent navigation, explicit actions
and readable records. Preserve this direction. Use one neutral palette, one type scale and one
control scale. Amber identifies the archive; blue identifies the apartment workspace. A teal (`green`) accent
remains available for other products. Status colours
have the same meaning in both products and always include a textual or iconic signal.

| Role           | Light     | Dark      |
| -------------- | --------- | --------- |
| Canvas         | `#EDF1F5` | `#10171F` |
| Surface        | `#FFFFFF` | `#1C2834` |
| Raised surface | `#FFFFFF` | `#263646` |
| Text           | `#14212D` | `#F2F6FA` |
| Secondary text | `#46586A` | `#B9C8D6` |
| Divider        | `#C6D0DA` | `#405469` |

IBM Plex Sans is bundled with the shared stylesheet and self-hosted by each application, with
matched Arial fallback metrics. IBM Plex Mono
is reserved for paths, hashes and code. Numbers use tabular figures. Body 14/21, page titles 24/31
(20/26 on phones), section titles 18/26. Controls 40 px, small 32 px, touch targets at least 44 px.
Radii: controls 6, surfaces 8, dialogs 12. Spacing: 4/8/12/16/20/24/32.
Navigation 240 px; compact rail 64 px in both applications. Page gutters 24/16/12, aligned to the left.
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
- `/react`: `NavigationFrame`, `AppBrand`, `PageHeader` and system appearance hooks; React is a peer. No Next or next-intl imports.
- `/styles.css`: bundled IBM Plex fonts, shared heading/layout rules and generated dimension variables; no product palette.
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
4. Publish through Changesets, then install the exact registry version in each application.

`@joshuan/design-system@0.2.1` is published from `19fc9f3` through GitHub Actions OIDC
with npm provenance. [CI](https://github.com/joshuan/js-lib/actions/runs/36875120791) and
[Release](https://github.com/joshuan/js-lib/actions/runs/36875120813) are green.
Both applications now install the exact public registry version. Its font files match the
previously accepted fonts in both consumers byte for byte. The temporary vendor archives and
Docker COPY instructions are removed. Production deployment remains a separate operation.

## Navigation and release completion — 2026-10-01

Both consumers use NavigationFrame from the React entry. Above 767 px the sidebar remains visible:
240 px expanded, 64 px collapsed. It starts collapsed below 1024 px; a user's explicit choice is
retained during client navigation and desktop/tablet resizing. Below 768 px navigation is a 280 px
left drawer, closed initially and when a link is activated, a route changes or the viewport grows.
The same 44 px collapse/expand control sits at the bottom. Mobile open/close controls are also 44 px;
Escape closes the drawer and returns focus through Ant Design's focus management.

The 64 px brand row always contains a home link: icon and name when expanded, icon only in the rail,
icon and name in the mobile bar and drawer. Each host provides its existing mark, accessible name,
Next Link and home route. Menus, account controls, apartment tree persistence and permissions remain
local. No launcher, shared identity or extra navigation configuration is introduced.

The user requests npm publication and both GitHub releases. Changesets owns the library release.
Both consumers install the exact registry version without a sibling checkout or vendor archive. Verify both apps' hosted checks and release image publication.

## Reproducible font assets — 2026-10-01

A fresh Rent Manager CI build on `1be882f` failed in the Google font loader, while parallel builds
of the same commit succeeded. This matches [Next.js issue 99114](https://github.com/vercel/next.js/issues/99114):
Google sometimes returns extensionless font URLs that the current bundler cannot parse.
The shared package therefore carries the exact 16 WOFF2 files already accepted in both consumer
visual suites, their SHA-256 manifest and IBM's SIL Open Font License. The bytes were compared
between Legere's font cache and Rent Manager's canonical Linux image before extraction.

The stylesheet owns `--font-sans` and `--font-mono`, preserving weight declarations, Unicode ranges,
font-display and fallback metrics. Consumers remove their Google loader calls. Neither building
nor rendering requires Google Fonts. Package checks verify every referenced binary and its digest;
both canonical consumer suites must compare without baseline updates. This is a patch release.

## Contrasting brands — 2026-10-03

The shared package owns the new foundations and the complete `amber`, `blue` and `green` palettes.
Legere chooses amber; consumers do not layer local themes over the factory. Action fills, on-brand
text, brand text, selected surfaces and form boundaries are separate roles. The amber fill is
`#FFBD3E` with dark `#332100` labels. The old muted theme is replaced rather than retained behind
an option. `Palette.accent` is removed in favor of explicit brand/semantic roles.

The [consumer upgrade guide](../packages/design-system/MIGRATION.md) is shipped in the npm package,
alongside the expanded README. Existing services upgrade independently; this task migrates Legere.
Tests cover all three accents in both modes, including semantic/named tags, controls and reduced
motion. Packed-consumer checks must verify the migration guide is present. Release through
Changesets; applications consume the exact published version.

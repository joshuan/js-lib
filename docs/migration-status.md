# Application migration status

Status as of 2026-09-02. Applications install exact versions from the public npm registry; no
`file:` workspace links remain.

| Application    | Shared integration                                                          | Verification                                            |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| `legere`       | config, HTTP, observability, Next/Nest, auth adapters, tooling, Next config | typecheck, lint, 1,650 unit/web tests, production build |
| `rent-manage`  | config, HTTP, observability, Next/Nest, auth adapters, tooling, Next config | typecheck, lint, 109 unit tests, production build       |
| `squadtab`     | config, HTTP, observability, Next/Nest, auth adapters, tooling, Next config | typecheck, lint, 195 unit/web tests, production build   |
| `finance`      | file password, bounded sessions, raw cookies, config, tooling, Next config  | typecheck, 130 tests, production build                  |
| `documents-ui` | file password, bounded sessions, raw cookies, config, tooling, Next config  | typecheck, production build                             |

Database-backed end-to-end suites remain application checks: they need their PostgreSQL services
and migrations. Package conformance and clean tarball installation are enforced in `js-lib` CI.

# @joshuan/http

Stable API envelopes plus secure Express and Nest adapters. Product error codes remain strings
owned by the consuming application.

Subpath exports keep framework dependencies optional:

- `@joshuan/http` — envelopes and structural validation contracts;
- `@joshuan/http/express` — CSRF, cookie and security-header middleware;
- `@joshuan/http/nest` — validation pipes and the exception filter.

The Express subpath also serializes equivalent `Set-Cookie` headers for Next Pages API responses.

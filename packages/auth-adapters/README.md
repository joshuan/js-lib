# @joshuan/auth-adapters

Node adapters with the security defaults used by the reference application:

- Argon2id with bounded concurrency and queue length;
- opaque 256-bit session tokens stored as SHA-256 hashes;
- HMAC-protected numeric verification codes and tickets;
- fail-closed Turnstile verification with timeout and response-size bounds;
- SMTP with STARTTLS required by default;
- a fallback email sender that never logs message bodies or verification codes.
- a bounded, hashed in-memory session store for single-user legacy services;
- a race-safe file password manager that accepts existing bcrypt or other hash adapters.

The legacy adapters are available separately from `@joshuan/auth-adapters/single-user`, so bundlers
do not need to load SMTP or Argon2 code when those adapters are not used.

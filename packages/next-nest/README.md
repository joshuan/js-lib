# @joshuan/next-nest

Runs Next and Nest on one Express instance and one port. The bootstrap fixes the ordering that is
easy to get subtly wrong while leaving product middleware and worker startup behind typed hooks.

The application supplies root middleware (security headers and CSRF), API middleware (logging,
cookies, bearer policy), raw-body routes, Nest configuration, and a `beforeListen` worker hook.

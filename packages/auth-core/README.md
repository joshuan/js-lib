# @joshuan/auth-core

Framework-free authentication flows. Applications implement repository ports and extend the base
user/session records with their product fields.

The package owns constant-work login, bounded failure backoff semantics, session issuance and
resolution, and the email-code-to-ticket flow. Applications own admission/invite policy and the
transaction that consumes a verified ticket while creating or repairing an account.

import { AccountDisabledError, AuthenticationRequiredError } from './errors.js';
import type {
  AuthSession,
  AuthSessionRepository,
  AuthUser,
  AuthUserRepository,
  Clock,
  SessionTokens,
} from './ports.js';

const DEFAULT_USER_AGENT_LIMIT = 512;

export type AuthenticatedSession<TUser extends AuthUser, TSession extends AuthSession> = {
  readonly user: TUser;
  readonly session: TSession;
};

export class SessionService<TUser extends AuthUser, TSession extends AuthSession> {
  constructor(
    private readonly users: AuthUserRepository<TUser>,
    private readonly sessions: AuthSessionRepository<TSession>,
    private readonly tokens: SessionTokens,
    private readonly clock: Clock,
    private readonly ttlMs: number,
    private readonly userAgentLimit = DEFAULT_USER_AGENT_LIMIT,
  ) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) throw new Error('Session TTL must be positive');
  }

  async issue(
    userId: string,
    userAgent: string | null,
  ): Promise<{ token: string; expiresAt: Date }> {
    const { token, hash } = this.tokens.issue();
    const expiresAt = new Date(this.clock.now().getTime() + this.ttlMs);
    await this.sessions.create({
      userId,
      tokenHash: hash,
      userAgent: userAgent === null ? null : userAgent.slice(0, this.userAgentLimit),
      expiresAt,
    });
    return { token, expiresAt };
  }

  async authenticate(token: string | undefined): Promise<AuthenticatedSession<TUser, TSession>> {
    if (token === undefined || token === '') throw new AuthenticationRequiredError();
    const session = await this.sessions.findByTokenHash(this.tokens.hash(token));
    if (
      session === null ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= this.clock.now().getTime()
    ) {
      throw new AuthenticationRequiredError();
    }
    const user = await this.users.findById(session.userId);
    if (user === null) throw new AuthenticationRequiredError();
    if (!user.active) throw new AccountDisabledError();
    return { user, session };
  }

  async revoke(token: string | undefined): Promise<void> {
    if (token === undefined || token === '') return;
    await this.sessions.revokeByTokenHash(this.tokens.hash(token), this.clock.now());
  }
}

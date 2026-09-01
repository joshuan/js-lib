import { describe, expect, it, vi } from 'vitest';
import { AuthRateLimitedError, InvalidCredentialsError } from './errors.js';
import { LoginService } from './login.js';
import {
  AuthEvents,
  AuthSessionRepository,
  AuthUserRepository,
  CaptchaVerifier,
  Clock,
  LoginAttempts,
  PasswordHasher,
  SessionTokens,
  type AuthEvent,
  type AuthSession,
  type AuthUser,
  type CreateSession,
} from './ports.js';
import { SessionService } from './sessions.js';

class Users extends AuthUserRepository<AuthUser> {
  constructor(private readonly user: AuthUser | null) {
    super();
  }
  async findById(id: string) {
    return this.user?.id === id ? this.user : null;
  }
  async findByEmail(email: string) {
    return this.user?.email === email ? this.user : null;
  }
}

class Sessions extends AuthSessionRepository<AuthSession> {
  created: CreateSession[] = [];
  async create(input: CreateSession): Promise<AuthSession> {
    this.created.push(input);
    return { id: 'session', ...input, createdAt: new Date(0), revokedAt: null };
  }
  async findByTokenHash() {
    return null;
  }
  async revokeByTokenHash() {}
  async revokeById() {}
  async listActiveForUser() {
    return [];
  }
}

class Events extends AuthEvents {
  readonly items: AuthEvent[] = [];
  record(event: AuthEvent): void {
    this.items.push(event);
  }
}

function fixture(user: AuthUser | null, matches: boolean) {
  const users = new Users(user);
  const sessions = new Sessions();
  const hasher: PasswordHasher = {
    hash: vi.fn(async () => 'dummy-hash'),
    verify: vi.fn(async () => matches),
  };
  const captcha: CaptchaVerifier = {
    configured: false,
    verify: vi.fn(async () => true),
  };
  const attempts: LoginAttempts = {
    recordFailure: vi.fn(),
    retryAfterMs: vi.fn(() => 0),
    clear: vi.fn(),
  };
  const tokens: SessionTokens = {
    issue: () => ({ token: 'plain', hash: 'hashed' }),
    hash: (v) => v,
  };
  const clock: Clock = { now: () => new Date(1_000) };
  const events = new Events();
  const sessionService = new SessionService(users, sessions, tokens, clock, 60_000);
  return {
    service: new LoginService(users, hasher, captcha, attempts, sessionService, events),
    hasher,
    attempts,
    sessions,
    events,
  };
}

describe('LoginService', () => {
  it('does exactly one password verification for an unknown address', async () => {
    const value = fixture(null, false);
    await expect(
      value.service.execute({ email: 'Nobody@Example.com ', password: 'guess', userAgent: null }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(value.hasher.hash).toHaveBeenCalledTimes(1);
    expect(value.hasher.verify).toHaveBeenCalledTimes(1);
    expect(value.events.items[0]).toMatchObject({
      event: 'login.failed',
      email: 'nobody@example.com',
      reason: 'INVALID_CREDENTIALS',
    });
  });

  it('checks a correct password before clearing a prior failure streak', async () => {
    const user = { id: 'user', email: 'a@example.com', passwordHash: 'hash', active: true };
    const value = fixture(user, true);
    const result = await value.service.execute({
      email: user.email,
      password: 'right',
      userAgent: 'browser',
    });
    expect(result.sessionToken).toBe('plain');
    expect(value.attempts.clear).toHaveBeenCalledWith(user.email);
    expect(value.sessions.created).toHaveLength(1);
  });

  it('returns a rate limit only after performing the failed verification', async () => {
    const value = fixture(null, false);
    vi.mocked(value.attempts.retryAfterMs).mockReturnValue(30_000);
    await expect(
      value.service.execute({ email: 'a@example.com', password: 'guess', userAgent: null }),
    ).rejects.toBeInstanceOf(AuthRateLimitedError);
    expect(value.hasher.verify).toHaveBeenCalledTimes(1);
  });
});

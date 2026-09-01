import { describe, expect, it } from 'vitest';
import { AuthenticationRequiredError } from './errors.js';
import {
  AuthSessionRepository,
  AuthUserRepository,
  type AuthSession,
  type AuthUser,
  type Clock,
  type CreateSession,
  type SessionTokens,
} from './ports.js';
import { SessionService } from './sessions.js';

class Users extends AuthUserRepository<AuthUser> {
  async findById() {
    return { id: 'user', email: 'a@example.com', passwordHash: 'x', active: true };
  }
  async findByEmail() {
    return null;
  }
}

class Sessions extends AuthSessionRepository<AuthSession> {
  value: AuthSession | null = null;
  async create(input: CreateSession): Promise<AuthSession> {
    this.value = { id: 'session', ...input, createdAt: new Date(0), revokedAt: null };
    return this.value;
  }
  async findByTokenHash() {
    return this.value;
  }
  async revokeByTokenHash(_hash: string, revokedAt: Date) {
    if (this.value) this.value = { ...this.value, revokedAt };
  }
  async revokeById() {}
  async listActiveForUser() {
    return this.value === null ? [] : [this.value];
  }
}

describe('SessionService', () => {
  it('stores only a token hash and truncates the user agent', async () => {
    const sessions = new Sessions();
    const tokens: SessionTokens = {
      issue: () => ({ token: 'plain', hash: 'hash' }),
      hash: () => 'hash',
    };
    const clock: Clock = { now: () => new Date(1_000) };
    const service = new SessionService(new Users(), sessions, tokens, clock, 60_000, 5);
    const issued = await service.issue('user', 'long browser');
    expect(issued.token).toBe('plain');
    expect(sessions.value?.tokenHash).toBe('hash');
    expect(sessions.value?.userAgent).toBe('long ');
    expect(JSON.stringify(sessions.value)).not.toContain('plain');
  });

  it('rejects an expired session', async () => {
    const sessions = new Sessions();
    sessions.value = {
      id: 'session',
      userId: 'user',
      tokenHash: 'hash',
      userAgent: null,
      createdAt: new Date(0),
      expiresAt: new Date(999),
      revokedAt: null,
    };
    const service = new SessionService(
      new Users(),
      sessions,
      { issue: () => ({ token: 'plain', hash: 'hash' }), hash: () => 'hash' },
      { now: () => new Date(1_000) },
      60_000,
    );
    await expect(service.authenticate('plain')).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });
});

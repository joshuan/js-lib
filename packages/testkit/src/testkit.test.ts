import { describe, expect, it } from 'vitest';
import { InMemoryAuthSessions, InMemoryVerifications } from './index.js';

describe('testkit doubles', () => {
  it('revokes an in-memory session', async () => {
    const sessions = new InMemoryAuthSessions();
    const created = await sessions.create({
      userId: 'user',
      tokenHash: 'hash',
      userAgent: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await sessions.revokeById(created.id, new Date());
    expect((await sessions.findByTokenHash('hash'))?.revokedAt).not.toBeNull();
  });

  it('supersedes active verification series without deleting history', async () => {
    const records = new InMemoryVerifications<Record<string, never>>();
    const input = {
      email: 'a@example.com',
      purpose: 'REGISTRATION' as const,
      codeHash: 'code',
      context: {},
      expiresAt: new Date(Date.now() + 60_000),
    };
    await records.create(input);
    await records.supersede(input.email, input.purpose, new Date());
    await records.create(input);
    expect(records.items).toHaveLength(2);
    expect(records.items[0]?.consumedAt).not.toBeNull();
    expect(records.items[1]?.consumedAt).toBeNull();
  });
});

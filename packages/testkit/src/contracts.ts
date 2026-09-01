import { describe, expect, it } from 'vitest';
import type { AuthSession, AuthSessionRepository } from '@joshuan/auth-core';

export function authSessionRepositoryContract(
  name: string,
  factory: () => Promise<AuthSessionRepository<AuthSession>> | AuthSessionRepository<AuthSession>,
): void {
  describe(`${name} AuthSessionRepository contract`, () => {
    it('creates and resolves a session by token hash', async () => {
      const repository = await factory();
      const created = await repository.create({
        userId: 'user',
        tokenHash: 'hash',
        userAgent: 'agent',
        expiresAt: new Date(Date.now() + 60_000),
      });
      expect(await repository.findByTokenHash('hash')).toMatchObject({
        id: created.id,
        userId: 'user',
      });
    });

    it('excludes revoked sessions from the active list', async () => {
      const repository = await factory();
      const now = new Date();
      const created = await repository.create({
        userId: 'user',
        tokenHash: 'hash',
        userAgent: null,
        expiresAt: new Date(now.getTime() + 60_000),
      });
      await repository.revokeById(created.id, now);
      expect(await repository.listActiveForUser('user', now)).toEqual([]);
    });

    it('excludes expired sessions from the active list', async () => {
      const repository = await factory();
      const now = new Date();
      await repository.create({
        userId: 'user',
        tokenHash: 'hash',
        userAgent: null,
        expiresAt: new Date(now.getTime() - 1),
      });
      expect(await repository.listActiveForUser('user', now)).toEqual([]);
    });
  });
}

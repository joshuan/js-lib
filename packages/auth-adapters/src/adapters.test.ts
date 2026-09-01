import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthUnavailableError, type Clock } from '@joshuan/auth-core';
import { SafeLogEmailSender } from './email.js';
import { ConcurrencyGate } from './primitives.js';
import { InMemoryLoginAttempts } from './throttles.js';
import { CryptoSessionTokens, HmacVerificationTokens } from './tokens.js';
import { TurnstileCaptchaVerifier } from './turnstile.js';
import { Argon2PasswordHasher } from './argon2.js';
import { FilePasswordManager, InMemorySessionManager } from './single-user.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('token adapters', () => {
  it('never stores the plain session token as its hash', () => {
    const tokens = new CryptoSessionTokens();
    const issued = tokens.issue();
    expect(issued.token).not.toBe(issued.hash);
    expect(tokens.hash(issued.token)).toBe(issued.hash);
  });

  it('verifies codes with a keyed digest', () => {
    const tokens = new HmacVerificationTokens('a-secret-at-least-thirty-two-bytes-long');
    const issued = tokens.issueCode();
    expect(tokens.verifyCode(issued.hash, issued.code)).toBe(true);
    expect(tokens.verifyCode(issued.hash, '000000')).toBe(false);
  });
});

describe('Argon2PasswordHasher', () => {
  it('can perform dummy verification for unknown accounts', async () => {
    const hasher = new Argon2PasswordHasher({ concurrency: 1, maxQueued: 1 });
    await expect(hasher.dummyVerify()).resolves.toBeUndefined();
  });
});

describe('ConcurrencyGate', () => {
  it('bounds its waiting queue', async () => {
    const gate = new ConcurrencyGate(1, 1);
    let release: (() => void) | undefined;
    const first = gate.run(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const second = gate.run(async () => {});
    await expect(gate.run(async () => {})).rejects.toBeInstanceOf(AuthUnavailableError);
    release?.();
    await Promise.all([first, second]);
  });
});

describe('TurnstileCaptchaVerifier', () => {
  it('fails closed on oversized responses', async () => {
    const verifier = new TurnstileCaptchaVerifier({
      secretKey: 'secret',
      maxResponseBytes: 4,
      fetch: async () => new Response('{"success":true}'),
    });
    await expect(verifier.verify('token', undefined)).resolves.toBe(false);
  });

  it('accepts only an explicit success response', async () => {
    const verifier = new TurnstileCaptchaVerifier({
      secretKey: 'secret',
      fetch: async () => Response.json({ success: true }),
    });
    await expect(verifier.verify('token', '203.0.113.2')).resolves.toBe(true);
  });
});

describe('bounded in-memory controls', () => {
  it('does not refuse before the configured failure threshold', () => {
    let now = 0;
    const clock: Clock = { now: () => new Date(now) };
    const attempts = new InMemoryLoginAttempts(clock, { threshold: 3, baseDelayMs: 100 });
    attempts.recordFailure('a');
    attempts.recordFailure('a');
    expect(attempts.retryAfterMs('a')).toBe(0);
    attempts.recordFailure('a');
    expect(attempts.retryAfterMs('a')).toBe(100);
    now = 101;
    expect(attempts.retryAfterMs('a')).toBe(0);
  });

  it('does not log an email body', async () => {
    const records: unknown[] = [];
    const sender = new SafeLogEmailSender((record) => records.push(record));
    await sender.send({ to: 'a@example.com', subject: 'Code', text: 'secret 123456' });
    expect(JSON.stringify(records)).not.toContain('123456');
  });
});

describe('single-user compatibility adapters', () => {
  it('creates, verifies, and atomically changes a password file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'joshuan-auth-'));
    temporaryDirectories.push(directory);
    const manager = new FilePasswordManager({
      filePath: join(directory, 'password.json'),
      hasher: {
        hash: async (password) => `hash:${password}`,
        verify: async (hash, password) => hash === `hash:${password}`,
      },
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(await manager.hasPassword()).toBe(false);
    await manager.createPassword('first');
    expect(await manager.verifyPassword('first')).toBe(true);
    await expect(manager.createPassword('again')).rejects.toThrow('Password already exists');
    await manager.changePassword('first', 'second');
    expect(await manager.verifyPassword('first')).toBe(false);
    expect(await manager.verifyPassword('second')).toBe(true);
  });

  it('bounds process-local sessions and expires them', () => {
    let now = 0;
    const sessions = new InMemorySessionManager({ ttlMs: 100, maxSessions: 1, now: () => now });
    const first = sessions.createSession();
    const second = sessions.createSession();
    expect(sessions.isValidSession(first)).toBe(false);
    expect(sessions.isValidSession(second)).toBe(true);
    now = 101;
    expect(sessions.isValidSession(second)).toBe(false);
  });
});

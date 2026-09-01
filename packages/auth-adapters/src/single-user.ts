import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CryptoSessionTokens } from './tokens.js';

export type PasswordHashAdapter = {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
};

export type FilePasswordManagerOptions = {
  readonly filePath: string;
  readonly hasher: PasswordHashAdapter;
  readonly now?: () => Date;
  readonly maxFileBytes?: number;
};

type PasswordFile = {
  readonly hash: string;
  readonly createdAt: string;
};

/** A fail-closed, single-user password file compatible with legacy hash adapters. */
export class FilePasswordManager {
  private readonly now: () => Date;
  private readonly maxFileBytes: number;

  constructor(private readonly options: FilePasswordManagerOptions) {
    this.now = options.now ?? (() => new Date());
    this.maxFileBytes = options.maxFileBytes ?? 64 * 1024;
  }

  async hasPassword(): Promise<boolean> {
    try {
      await access(this.options.filePath);
      return true;
    } catch (error) {
      if (hasCode(error, 'ENOENT')) return false;
      throw error;
    }
  }

  async createPassword(password: string): Promise<void> {
    if (await this.hasPassword()) throw new Error('Password already exists');
    const hash = await this.options.hasher.hash(password);
    await mkdir(dirname(this.options.filePath), { recursive: true });
    try {
      await writeFile(this.options.filePath, serialize(hash, this.now()), {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
    } catch (error) {
      if (hasCode(error, 'EEXIST')) throw new Error('Password already exists');
      throw error;
    }
  }

  async verifyPassword(password: string): Promise<boolean> {
    try {
      const content = await readFile(this.options.filePath, 'utf8');
      if (Buffer.byteLength(content) > this.maxFileBytes) return false;
      const parsed = parsePasswordFile(content);
      return parsed === null ? false : await this.options.hasher.verify(parsed.hash, password);
    } catch {
      return false;
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!(await this.verifyPassword(oldPassword))) throw new Error('Invalid old password');
    const hash = await this.options.hasher.hash(newPassword);
    await this.replace(serialize(hash, this.now()));
  }

  private async replace(content: string): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    const temporary = `${this.options.filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      await rename(temporary, this.options.filePath);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  }
}

export type InMemorySessionManagerOptions = {
  readonly ttlMs?: number;
  readonly maxSessions?: number;
  readonly now?: () => number;
};

type Session = { readonly createdAt: number; readonly expiresAt: number };

/** Bounded process-local sessions; only SHA-256 token digests are retained in memory. */
export class InMemorySessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly tokens = new CryptoSessionTokens();
  private readonly ttlMs: number;
  private readonly maxSessions: number;
  private readonly now: () => number;

  constructor(options: InMemorySessionManagerOptions = {}) {
    this.ttlMs = options.ttlMs ?? 7 * 24 * 60 * 60 * 1_000;
    this.maxSessions = options.maxSessions ?? 1_024;
    this.now = options.now ?? (() => Date.now());
    if (!Number.isSafeInteger(this.ttlMs) || this.ttlMs <= 0) {
      throw new Error('Session TTL must be a positive integer');
    }
    if (!Number.isSafeInteger(this.maxSessions) || this.maxSessions <= 0) {
      throw new Error('Maximum session count must be a positive integer');
    }
  }

  createSession(): string {
    this.cleanupExpiredSessions();
    while (this.sessions.size >= this.maxSessions) this.evictOldest();
    const issued = this.tokens.issue();
    const now = this.now();
    this.sessions.set(issued.hash, { createdAt: now, expiresAt: now + this.ttlMs });
    return issued.token;
  }

  isValidSession(token: string): boolean {
    const hash = this.tokens.hash(token);
    const session = this.sessions.get(hash);
    if (session === undefined) return false;
    if (this.now() > session.expiresAt) {
      this.sessions.delete(hash);
      return false;
    }
    return true;
  }

  destroySession(token: string): void {
    this.sessions.delete(this.tokens.hash(token));
  }

  destroyAllSessions(): void {
    this.sessions.clear();
  }

  getActiveSessionCount(): number {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }

  private cleanupExpiredSessions(): void {
    const now = this.now();
    for (const [hash, session] of this.sessions) {
      if (now > session.expiresAt) this.sessions.delete(hash);
    }
  }

  private evictOldest(): void {
    let oldestHash: string | null = null;
    let oldestCreatedAt = Number.POSITIVE_INFINITY;
    for (const [hash, session] of this.sessions) {
      if (session.createdAt < oldestCreatedAt) {
        oldestHash = hash;
        oldestCreatedAt = session.createdAt;
      }
    }
    if (oldestHash !== null) this.sessions.delete(oldestHash);
  }
}

function serialize(hash: string, now: Date): string {
  return `${JSON.stringify({ hash, createdAt: now.toISOString() }, null, 2)}\n`;
}

function parsePasswordFile(content: string): PasswordFile | null {
  const value: unknown = JSON.parse(content);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const hash: unknown = Reflect.get(value, 'hash');
  const createdAt: unknown = Reflect.get(value, 'createdAt');
  return typeof hash === 'string' && hash !== '' && typeof createdAt === 'string'
    ? { hash, createdAt }
    : null;
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && Reflect.get(error, 'code') === code;
}

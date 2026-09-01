import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { PasswordHasher } from '@joshuan/auth-core';
import { ConcurrencyGate } from './primitives.js';

export type Argon2PasswordHasherOptions = {
  readonly memoryCost?: number;
  readonly timeCost?: number;
  readonly parallelism?: number;
  readonly concurrency?: number;
  readonly maxQueued?: number;
};

export class Argon2PasswordHasher extends PasswordHasher {
  private readonly hashOptions: {
    readonly type: typeof argon2.argon2id;
    readonly memoryCost: number;
    readonly timeCost: number;
    readonly parallelism: number;
  };
  private readonly gate: ConcurrencyGate;
  private dummyHash: Promise<string> | null = null;

  constructor(options: Argon2PasswordHasherOptions = {}) {
    super();
    this.hashOptions = {
      type: argon2.argon2id,
      memoryCost: options.memoryCost ?? 19_456,
      timeCost: options.timeCost ?? 2,
      parallelism: options.parallelism ?? 1,
    };
    this.gate = new ConcurrencyGate(options.concurrency ?? 2, options.maxQueued ?? 32);
  }

  hash(password: string): Promise<string> {
    return this.gate.run(() => argon2.hash(password, this.hashOptions));
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await this.gate.run(() => argon2.verify(hash, password));
    } catch {
      return false;
    }
  }

  /** Performs a real verification when no account hash exists, flattening login timing. */
  async dummyVerify(): Promise<void> {
    this.dummyHash ??= this.hash(randomBytes(24).toString('hex'));
    await this.verify(await this.dummyHash, 'not-the-password');
  }
}

import {
  LoginAttempts,
  VerificationThrottle,
  type Clock,
  type VerificationPurpose,
} from '@joshuan/auth-core';

export type LoginAttemptOptions = {
  readonly threshold?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly maxEntries?: number;
};

export class InMemoryLoginAttempts extends LoginAttempts {
  private readonly entries = new Map<string, { count: number; until: number; touched: number }>();
  private readonly threshold: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly maxEntries: number;

  constructor(
    private readonly clock: Clock,
    options: LoginAttemptOptions = {},
  ) {
    super();
    this.threshold = options.threshold ?? 5;
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
    this.maxDelayMs = options.maxDelayMs ?? 15 * 60_000;
    this.maxEntries = options.maxEntries ?? 10_000;
  }

  get tracked(): number {
    return this.entries.size;
  }

  recordFailure(key: string): void {
    const now = this.clock.now().getTime();
    this.sweep(now);
    const previous = this.entries.get(key);
    const count = previous === undefined ? 1 : previous.count + 1;
    const exponent = Math.max(0, count - this.threshold);
    const delay =
      count < this.threshold ? 0 : Math.min(this.baseDelayMs * 2 ** exponent, this.maxDelayMs);
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (typeof oldest === 'string') this.entries.delete(oldest);
    }
    this.entries.delete(key);
    this.entries.set(key, { count, until: now + delay, touched: now });
  }

  retryAfterMs(key: string): number {
    const entry = this.entries.get(key);
    return entry === undefined ? 0 : Math.max(0, entry.until - this.clock.now().getTime());
  }

  clear(key: string): void {
    this.entries.delete(key);
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.until <= now && now - entry.touched > this.maxDelayMs) this.entries.delete(key);
    }
  }
}

export class InMemoryVerificationThrottle extends VerificationThrottle {
  private readonly sent = new Map<string, number[]>();

  constructor(
    private readonly clock: Clock,
    private readonly options: {
      readonly cooldownMs?: number;
      readonly windowMs?: number;
      readonly maxPerWindow?: number;
      readonly maxEntries?: number;
    } = {},
  ) {
    super();
  }

  retryAfterMs(email: string, purpose: VerificationPurpose): Promise<number> {
    const now = this.clock.now().getTime();
    const values = this.liveValues(this.key(email, purpose), now);
    const last = values.at(-1);
    const cooldown = this.options.cooldownMs ?? 60_000;
    if (last !== undefined && now - last < cooldown) {
      return Promise.resolve(cooldown - (now - last));
    }
    if (values.length >= (this.options.maxPerWindow ?? 5)) {
      const first = values[0];
      return Promise.resolve(
        first === undefined ? 0 : Math.max(1, first + (this.options.windowMs ?? 86_400_000) - now),
      );
    }
    return Promise.resolve(0);
  }

  recordSent(email: string, purpose: VerificationPurpose): Promise<void> {
    const now = this.clock.now().getTime();
    const key = this.key(email, purpose);
    if (!this.sent.has(key) && this.sent.size >= (this.options.maxEntries ?? 10_000)) {
      const oldest = this.sent.keys().next().value;
      if (typeof oldest === 'string') this.sent.delete(oldest);
    }
    const values = this.liveValues(key, now);
    values.push(now);
    this.sent.delete(key);
    this.sent.set(key, values);
    return Promise.resolve();
  }

  private liveValues(key: string, now: number): number[] {
    const cutoff = now - (this.options.windowMs ?? 86_400_000);
    const values = (this.sent.get(key) ?? []).filter((value) => value > cutoff);
    if (values.length === 0) this.sent.delete(key);
    else this.sent.set(key, values);
    return values;
  }

  private key(email: string, purpose: VerificationPurpose): string {
    return `${purpose}:${email.trim().toLowerCase()}`;
  }
}

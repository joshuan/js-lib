import {
  AuthEvents,
  AuthSessionRepository,
  AuthUserRepository,
  CaptchaVerifier,
  Clock,
  EmailSender,
  LoginAttempts,
  PasswordHasher,
  SessionTokens,
  VerificationRepository,
  VerificationThrottle,
  VerificationTokens,
  type AuthEvent,
  type AuthSession,
  type AuthUser,
  type CreateSession,
  type EmailMessage,
  type VerificationPurpose,
  type VerificationRecord,
} from '@joshuan/auth-core';

export class FakeClock extends Clock {
  constructor(private value = new Date('2026-01-01T00:00:00.000Z')) {
    super();
  }
  now(): Date {
    return new Date(this.value);
  }
  advance(milliseconds: number): void {
    this.value = new Date(this.value.getTime() + milliseconds);
  }
}

export class InMemoryAuthUsers<TUser extends AuthUser> extends AuthUserRepository<TUser> {
  constructor(readonly items: TUser[] = []) {
    super();
  }
  async findById(id: string): Promise<TUser | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findByEmail(email: string): Promise<TUser | null> {
    return this.items.find((item) => item.email.toLowerCase() === email.toLowerCase()) ?? null;
  }
}

export class InMemoryAuthSessions extends AuthSessionRepository<AuthSession> {
  readonly items: AuthSession[] = [];
  private nextId = 1;

  async create(input: CreateSession): Promise<AuthSession> {
    const session: AuthSession = {
      id: `session-${this.nextId++}`,
      ...input,
      createdAt: new Date(),
      revokedAt: null,
    };
    this.items.push(session);
    return session;
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    return this.items.find((item) => item.tokenHash === tokenHash) ?? null;
  }

  async revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<void> {
    this.replace((item) => item.tokenHash === tokenHash, revokedAt);
  }

  async revokeById(id: string, revokedAt: Date): Promise<void> {
    this.replace((item) => item.id === id, revokedAt);
  }

  async listActiveForUser(userId: string, now: Date): Promise<readonly AuthSession[]> {
    return this.items.filter(
      (item) => item.userId === userId && item.revokedAt === null && item.expiresAt > now,
    );
  }

  private replace(matches: (session: AuthSession) => boolean, revokedAt: Date): void {
    const index = this.items.findIndex(matches);
    if (index >= 0) {
      const current = this.items[index];
      if (current !== undefined) this.items[index] = { ...current, revokedAt };
    }
  }
}

export class DeterministicSessionTokens extends SessionTokens {
  private next = 1;
  issue(): { token: string; hash: string } {
    const token = `plain-${this.next++}`;
    return { token, hash: this.hash(token) };
  }
  hash(token: string): string {
    return `hash:${token}`;
  }
}

export class TestPasswordHasher extends PasswordHasher {
  readonly verified: Array<{ hash: string; password: string }> = [];
  async hash(password: string): Promise<string> {
    return `password:${password}`;
  }
  async verify(hash: string, password: string): Promise<boolean> {
    this.verified.push({ hash, password });
    return hash === `password:${password}`;
  }
}

export class FakeCaptchaVerifier extends CaptchaVerifier {
  constructor(
    readonly configured: boolean,
    private result = true,
  ) {
    super();
  }
  setResult(result: boolean): void {
    this.result = result;
  }
  async verify(): Promise<boolean> {
    return this.result;
  }
}

export class CollectingEmailSender extends EmailSender {
  readonly messages: EmailMessage[] = [];
  get available(): boolean {
    return true;
  }
  async send(message: EmailMessage): Promise<void> {
    this.messages.push(message);
  }
}

export class TestLoginAttempts extends LoginAttempts {
  readonly failures = new Map<string, number>();
  retry = 0;
  recordFailure(key: string): void {
    this.failures.set(key, (this.failures.get(key) ?? 0) + 1);
  }
  retryAfterMs(): number {
    return this.retry;
  }
  clear(key: string): void {
    this.failures.delete(key);
  }
}

export class CollectingAuthEvents extends AuthEvents {
  readonly events: AuthEvent[] = [];
  record(event: AuthEvent): void {
    this.events.push(event);
  }
}

export class DeterministicVerificationTokens extends VerificationTokens {
  private next = 1;
  issueCode(): { code: string; hash: string } {
    const code = String(this.next++).padStart(6, '0');
    return { code, hash: `code:${code}` };
  }
  verifyCode(hash: string, code: string): boolean {
    return hash === `code:${code}`;
  }
  issueTicket(): { ticket: string; hash: string } {
    const ticket = `ticket-${this.next++}`;
    return { ticket, hash: this.hashTicket(ticket) };
  }
  hashTicket(ticket: string): string {
    return `ticket-hash:${ticket}`;
  }
}

export class InMemoryVerifications<TContext> extends VerificationRepository<TContext> {
  readonly items: VerificationRecord<TContext>[] = [];
  private nextId = 1;

  async supersede(email: string, purpose: VerificationPurpose, now: Date): Promise<void> {
    for (let index = 0; index < this.items.length; index += 1) {
      const current = this.items[index];
      if (current?.email === email && current.purpose === purpose && current.consumedAt === null) {
        this.items[index] = { ...current, consumedAt: now };
      }
    }
  }

  async create(input: {
    readonly email: string;
    readonly purpose: VerificationPurpose;
    readonly codeHash: string;
    readonly context: TContext;
    readonly expiresAt: Date;
  }): Promise<VerificationRecord<TContext>> {
    const record: VerificationRecord<TContext> = {
      id: `verification-${this.nextId++}`,
      ...input,
      attempts: 0,
      createdAt: new Date(),
      consumedAt: null,
      ticketHash: null,
      ticketExpiresAt: null,
    };
    this.items.push(record);
    return record;
  }

  async latest(
    email: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationRecord<TContext> | null> {
    return (
      [...this.items].reverse().find((item) => item.email === email && item.purpose === purpose) ??
      null
    );
  }

  async incrementAttempts(id: string): Promise<number> {
    const index = this.items.findIndex((item) => item.id === id);
    const current = this.items[index];
    if (current === undefined) return 0;
    const attempts = current.attempts + 1;
    this.items[index] = { ...current, attempts };
    return attempts;
  }

  async setTicket(
    id: string,
    input: {
      readonly ticketHash: string;
      readonly ticketExpiresAt: Date;
      readonly verifiedAt: Date;
    },
  ): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    const current = this.items[index];
    if (current !== undefined) this.items[index] = { ...current, ...input };
  }

  async findByTicketHash(ticketHash: string): Promise<VerificationRecord<TContext> | null> {
    return this.items.find((item) => item.ticketHash === ticketHash) ?? null;
  }
}

export class AllowAllVerificationThrottle extends VerificationThrottle {
  async retryAfterMs(): Promise<number> {
    return 0;
  }
  async recordSent(): Promise<void> {}
}

import { AuthRateLimitedError, VerificationFailedError } from './errors.js';
import type { Clock, EmailSender } from './ports.js';

export type VerificationPurpose = 'REGISTRATION' | 'PASSWORD_RESET';

export type VerificationRecord<TContext> = {
  readonly id: string;
  readonly email: string;
  readonly purpose: VerificationPurpose;
  readonly codeHash: string;
  readonly attempts: number;
  readonly context: TContext;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly ticketHash: string | null;
  readonly ticketExpiresAt: Date | null;
};

export abstract class VerificationTokens {
  abstract issueCode(): { readonly code: string; readonly hash: string };
  abstract verifyCode(hash: string, code: string): boolean;
  abstract issueTicket(): { readonly ticket: string; readonly hash: string };
  abstract hashTicket(ticket: string): string;
}

export abstract class VerificationRepository<TContext> {
  abstract supersede(email: string, purpose: VerificationPurpose, now: Date): Promise<void>;
  abstract create(input: {
    readonly email: string;
    readonly purpose: VerificationPurpose;
    readonly codeHash: string;
    readonly context: TContext;
    readonly expiresAt: Date;
  }): Promise<VerificationRecord<TContext>>;
  abstract latest(
    email: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationRecord<TContext> | null>;
  abstract incrementAttempts(id: string): Promise<number>;
  abstract setTicket(
    id: string,
    input: {
      readonly ticketHash: string;
      readonly ticketExpiresAt: Date;
      readonly verifiedAt: Date;
    },
  ): Promise<void>;
  abstract findByTicketHash(ticketHash: string): Promise<VerificationRecord<TContext> | null>;
}

export abstract class VerificationThrottle {
  abstract retryAfterMs(email: string, purpose: VerificationPurpose): Promise<number>;
  abstract recordSent(email: string, purpose: VerificationPurpose): Promise<void>;
}

export type StartVerificationInput<TContext> = {
  readonly email: string;
  readonly purpose: VerificationPurpose;
  readonly context: TContext;
  readonly subject: string;
  readonly message: (code: string, expiresAt: Date) => string;
};

export class EmailVerificationService<TContext> {
  constructor(
    private readonly repository: VerificationRepository<TContext>,
    private readonly tokens: VerificationTokens,
    private readonly throttle: VerificationThrottle,
    private readonly email: EmailSender,
    private readonly clock: Clock,
    private readonly options: {
      readonly codeTtlMs: number;
      readonly ticketTtlMs: number;
      readonly maxAttempts: number;
    },
  ) {}

  async start(input: StartVerificationInput<TContext>): Promise<{ expiresAt: Date }> {
    const email = input.email.trim().toLowerCase();
    const retryAfterMs = await this.throttle.retryAfterMs(email, input.purpose);
    if (retryAfterMs > 0) throw new AuthRateLimitedError(retryAfterMs);

    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + this.options.codeTtlMs);
    const code = this.tokens.issueCode();
    await this.repository.supersede(email, input.purpose, now);
    await this.repository.create({
      email,
      purpose: input.purpose,
      codeHash: code.hash,
      context: input.context,
      expiresAt,
    });
    await this.email.send({
      to: email,
      subject: input.subject,
      text: input.message(code.code, expiresAt),
    });
    await this.throttle.recordSent(email, input.purpose);
    return { expiresAt };
  }

  async verify(input: {
    readonly email: string;
    readonly purpose: VerificationPurpose;
    readonly code: string;
  }): Promise<{ ticket: string; expiresAt: Date }> {
    const now = this.clock.now();
    const record = await this.repository.latest(input.email.trim().toLowerCase(), input.purpose);
    if (
      record === null ||
      record.consumedAt !== null ||
      record.expiresAt.getTime() <= now.getTime() ||
      record.attempts >= this.options.maxAttempts
    ) {
      throw new VerificationFailedError();
    }
    if (!this.tokens.verifyCode(record.codeHash, input.code)) {
      await this.repository.incrementAttempts(record.id);
      throw new VerificationFailedError();
    }

    const ticket = this.tokens.issueTicket();
    const expiresAt = new Date(now.getTime() + this.options.ticketTtlMs);
    await this.repository.setTicket(record.id, {
      ticketHash: ticket.hash,
      ticketExpiresAt: expiresAt,
      verifiedAt: now,
    });
    return { ticket: ticket.ticket, expiresAt };
  }

  async resolveTicket(
    ticket: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationRecord<TContext>> {
    const record = await this.repository.findByTicketHash(this.tokens.hashTicket(ticket));
    const now = this.clock.now();
    if (
      record === null ||
      record.purpose !== purpose ||
      record.consumedAt !== null ||
      record.ticketHash === null ||
      record.ticketExpiresAt === null ||
      record.ticketExpiresAt.getTime() <= now.getTime()
    ) {
      throw new VerificationFailedError(
        'REGISTRATION_TICKET_INVALID',
        'This step expired — start again',
      );
    }
    return record;
  }
}

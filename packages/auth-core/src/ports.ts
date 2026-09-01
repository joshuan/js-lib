export type AuthUser = {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly active: boolean;
};

export type AuthSession = {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly userAgent: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
};

export abstract class Clock {
  abstract now(): Date;
}

export abstract class PasswordHasher {
  abstract hash(password: string): Promise<string>;
  abstract verify(hash: string, password: string): Promise<boolean>;
}

export type IssuedToken = { readonly token: string; readonly hash: string };

export abstract class SessionTokens {
  abstract issue(): IssuedToken;
  abstract hash(token: string): string;
}

export abstract class CaptchaVerifier {
  abstract get configured(): boolean;
  abstract verify(token: string | undefined, ip: string | undefined): Promise<boolean>;
}

export type EmailMessage = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
};

export abstract class EmailSender {
  abstract get available(): boolean;
  abstract send(message: EmailMessage): Promise<void>;
}

export abstract class AuthUserRepository<TUser extends AuthUser> {
  abstract findById(id: string): Promise<TUser | null>;
  abstract findByEmail(email: string): Promise<TUser | null>;
}

export type CreateSession = {
  readonly userId: string;
  readonly tokenHash: string;
  readonly userAgent: string | null;
  readonly expiresAt: Date;
};

export abstract class AuthSessionRepository<TSession extends AuthSession> {
  abstract create(input: CreateSession): Promise<TSession>;
  abstract findByTokenHash(tokenHash: string): Promise<TSession | null>;
  abstract revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<void>;
  abstract revokeById(id: string, revokedAt: Date): Promise<void>;
  abstract listActiveForUser(userId: string, now: Date): Promise<readonly TSession[]>;
}

export abstract class LoginAttempts {
  abstract recordFailure(key: string): void;
  abstract retryAfterMs(key: string): number;
  abstract clear(key: string): void;
}

export type AuthEvent =
  | {
      readonly event: 'login.succeeded';
      readonly email: string;
      readonly userId: string;
      readonly ip?: string;
    }
  | {
      readonly event: 'login.failed';
      readonly email: string;
      readonly userId?: string;
      readonly ip?: string;
      readonly reason: 'INVALID_CREDENTIALS' | 'CAPTCHA_FAILED' | 'ACCOUNT_DEACTIVATED';
    }
  | {
      readonly event: 'login.throttled';
      readonly email: string;
      readonly ip?: string;
    }
  | {
      readonly event: 'session.revoked';
      readonly userId: string;
      readonly sessionId?: string;
    };

export abstract class AuthEvents {
  abstract record(event: AuthEvent): void;
}

export class NoopAuthEvents extends AuthEvents {
  record(_event: AuthEvent): void {}
}

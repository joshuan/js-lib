import {
  AccountDisabledError,
  AuthRateLimitedError,
  CaptchaFailedError,
  InvalidCredentialsError,
} from './errors.js';
import type {
  AuthEvents,
  AuthSession,
  AuthUser,
  AuthUserRepository,
  CaptchaVerifier,
  LoginAttempts,
  PasswordHasher,
} from './ports.js';
import type { SessionService } from './sessions.js';

const DUMMY_PASSWORD = 'constant-work-login-dummy-password';

export type LoginInput = {
  readonly email: string;
  readonly password: string;
  readonly captchaToken?: string;
  readonly ip?: string;
  readonly userAgent: string | null;
};

export type LoginResult<TUser extends AuthUser> = {
  readonly user: TUser;
  readonly sessionToken: string;
  readonly expiresAt: Date;
};

export class LoginService<TUser extends AuthUser, TSession extends AuthSession> {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly users: AuthUserRepository<TUser>,
    private readonly hasher: PasswordHasher,
    private readonly captcha: CaptchaVerifier,
    private readonly attempts: LoginAttempts,
    private readonly sessions: SessionService<TUser, TSession>,
    private readonly events: AuthEvents,
    private readonly normalizeEmail: (email: string) => string = defaultNormalizeEmail,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult<TUser>> {
    const email = this.normalizeEmail(input.email);
    if (this.captcha.configured && !(await this.captcha.verify(input.captchaToken, input.ip))) {
      this.events.record({
        event: 'login.failed',
        email,
        ...(input.ip === undefined ? {} : { ip: input.ip }),
        reason: 'CAPTCHA_FAILED',
      });
      throw new CaptchaFailedError();
    }

    const user = await this.users.findByEmail(email);
    const passwordHash = user?.passwordHash ?? (await this.dummy());
    const matches = await this.hasher.verify(passwordHash, input.password);

    if (user === null || !matches) {
      this.attempts.recordFailure(email);
      const retryAfterMs = this.attempts.retryAfterMs(email);
      if (retryAfterMs > 0) {
        this.events.record({
          event: 'login.throttled',
          email,
          ...(input.ip === undefined ? {} : { ip: input.ip }),
        });
        throw new AuthRateLimitedError(retryAfterMs);
      }
      this.events.record({
        event: 'login.failed',
        email,
        ...(input.ip === undefined ? {} : { ip: input.ip }),
        reason: 'INVALID_CREDENTIALS',
      });
      throw new InvalidCredentialsError();
    }

    if (!user.active) {
      this.events.record({
        event: 'login.failed',
        email,
        userId: user.id,
        ...(input.ip === undefined ? {} : { ip: input.ip }),
        reason: 'ACCOUNT_DEACTIVATED',
      });
      throw new AccountDisabledError();
    }

    this.attempts.clear(email);
    const issued = await this.sessions.issue(user.id, input.userAgent);
    this.events.record({
      event: 'login.succeeded',
      email,
      userId: user.id,
      ...(input.ip === undefined ? {} : { ip: input.ip }),
    });
    return { user, sessionToken: issued.token, expiresAt: issued.expiresAt };
  }

  private dummy(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(DUMMY_PASSWORD);
    return this.dummyHash;
  }
}

function defaultNormalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

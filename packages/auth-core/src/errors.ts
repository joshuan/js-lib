export type AuthErrorKind =
  'UNAUTHENTICATED' | 'FORBIDDEN' | 'VALIDATION' | 'RATE_LIMITED' | 'UNAVAILABLE';

export class AuthError extends Error {
  constructor(
    readonly kind: AuthErrorKind,
    readonly code: string,
    message: string,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super('UNAUTHENTICATED', 'INVALID_CREDENTIALS', 'Wrong email or password');
  }
}

export class AuthenticationRequiredError extends AuthError {
  constructor() {
    super('UNAUTHENTICATED', 'UNAUTHENTICATED', 'Authentication required');
  }
}

export class AccountDisabledError extends AuthError {
  constructor() {
    super('FORBIDDEN', 'FORBIDDEN', 'This account is deactivated');
  }
}

export class AuthRateLimitedError extends AuthError {
  constructor(readonly retryAfterMs: number) {
    super('RATE_LIMITED', 'RATE_LIMITED', 'Too many attempts; try again later', {
      retryAfterMs,
    });
  }
}

export class CaptchaFailedError extends AuthError {
  constructor() {
    super('VALIDATION', 'CAPTCHA_FAILED', 'CAPTCHA verification failed');
  }
}

export class VerificationFailedError extends AuthError {
  constructor(code = 'EMAIL_CODE_INVALID', message = 'That code is not right') {
    super('VALIDATION', code, message);
  }
}

export class AuthUnavailableError extends AuthError {
  constructor(message = 'Authentication service is temporarily unavailable') {
    super('UNAVAILABLE', 'AUTH_UNAVAILABLE', message);
  }
}

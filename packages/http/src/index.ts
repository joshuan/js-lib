export type Envelope<T> = { readonly data: T };

export type ErrorEnvelope<TCode extends string = string> = {
  readonly error: {
    readonly code: TCode;
    readonly message: string;
    readonly details: unknown;
  };
};

export function successEnvelope<T>(data: T): Envelope<T> {
  return { data };
}

export function errorEnvelope<TCode extends string>(
  code: TCode,
  message: string,
  details: unknown = null,
): ErrorEnvelope<TCode> {
  return { error: { code, message, details } };
}

export type ValidationSuccess<T> = { readonly success: true; readonly data: T };
export type ValidationFailure<TIssue = unknown> = {
  readonly success: false;
  readonly error: { readonly issues: readonly TIssue[] };
};

export type SafeParseSchema<T, TIssue = unknown> = {
  safeParse(value: unknown): ValidationSuccess<T> | ValidationFailure<TIssue>;
};

export type ApiError<TCode extends string = string> = {
  readonly code: TCode;
  readonly message: string;
  readonly details?: unknown;
  readonly status: number;
};

export abstract class ApiErrorMapper {
  abstract map(exception: unknown): ApiError | null;
}

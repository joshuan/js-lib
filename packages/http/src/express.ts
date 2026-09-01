import { randomBytes } from 'node:crypto';
import type { CookieOptions } from 'express';
import { errorEnvelope } from './index.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const HSTS = 'max-age=31536000; includeSubDomains';

export type HttpRequest = {
  readonly method: string;
  readonly path: string;
  readonly headers: Record<string, string | string[] | undefined>;
  get(name: string): string | undefined;
};

export type HttpResponse = {
  setHeader(name: string, value: string): unknown;
  status(code: number): HttpResponse;
  json(body: unknown): unknown;
};

export type Next = () => void;

export function isPathBelow(path: string, prefix: string): boolean {
  const normalized = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  return path === normalized || path.startsWith(`${normalized}/`);
}

export type CsrfOptions = {
  readonly appBaseUrl: string;
  readonly exempt?: (request: HttpRequest) => boolean;
  readonly failure?: { readonly code: string; readonly message: string };
};

export function csrfOriginCheck(options: CsrfOptions) {
  return (request: HttpRequest, response: HttpResponse, next: Next): void => {
    if (csrfOriginAllowed(request, options)) {
      next();
      return;
    }
    const failure = options.failure ?? {
      code: 'FORBIDDEN',
      message: 'Request origin is missing or not allowed',
    };
    response.status(403).json(errorEnvelope(failure.code, failure.message));
  };
}

export function csrfOriginAllowed(
  request: HttpRequest,
  options: CsrfOptions & { readonly additionalSafeMethods?: readonly string[] },
): boolean {
  const method = request.method.toUpperCase();
  if (
    SAFE_METHODS.has(method) ||
    options.additionalSafeMethods?.some((candidate) => candidate.toUpperCase() === method) ===
      true ||
    options.exempt?.(request) === true
  ) {
    return true;
  }
  return originOf(request) === new URL(options.appBaseUrl).origin;
}

export type SessionCookieOptions = {
  readonly secure: boolean;
  readonly domain?: string | null;
  readonly maxAgeMs?: number;
  readonly sameSite?: CookieOptions['sameSite'];
  readonly path?: string;
};

export type CookieSink = {
  cookie(name: string, value: string, options?: CookieOptions): unknown;
  clearCookie(name: string, options?: CookieOptions): unknown;
};

export function sessionCookieOptions(options: SessionCookieOptions): CookieOptions {
  return {
    httpOnly: true,
    secure: options.secure,
    sameSite: options.sameSite ?? 'lax',
    path: options.path ?? '/',
    ...(options.domain === undefined || options.domain === null || options.domain === ''
      ? {}
      : { domain: options.domain }),
    ...(options.maxAgeMs === undefined ? {} : { maxAge: options.maxAgeMs }),
  };
}

export function setSessionCookie(
  response: CookieSink,
  name: string,
  token: string,
  options: SessionCookieOptions,
): void {
  response.cookie(name, token, sessionCookieOptions(options));
}

export function clearSessionCookie(
  response: CookieSink,
  name: string,
  options: Omit<SessionCookieOptions, 'maxAgeMs'>,
): void {
  response.clearCookie(name, sessionCookieOptions(options));
}

/** Serializes a session cookie for frameworks exposing only a Set-Cookie header API. */
export function sessionCookieHeader(
  name: string,
  token: string,
  options: SessionCookieOptions,
): string {
  assertCookiePart(name, 'cookie name');
  const path = options.path ?? '/';
  assertCookiePart(path, 'cookie path');
  const attributes = [
    `${name}=${encodeURIComponent(token)}`,
    'HttpOnly',
    `Path=${path}`,
    `SameSite=${sameSiteText(options.sameSite ?? 'lax')}`,
  ];
  if (options.secure) attributes.push('Secure');
  if (options.domain !== undefined && options.domain !== null && options.domain !== '') {
    assertCookiePart(options.domain, 'cookie domain');
    attributes.push(`Domain=${options.domain}`);
  }
  if (options.maxAgeMs !== undefined) {
    attributes.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeMs / 1_000))}`);
  }
  return attributes.join('; ');
}

export function clearSessionCookieHeader(
  name: string,
  options: Omit<SessionCookieOptions, 'maxAgeMs'>,
): string {
  return sessionCookieHeader(name, '', { ...options, maxAgeMs: 0 });
}

export type PageSecurityPolicy = {
  readonly scriptOrigins?: readonly string[];
  readonly connectOrigins?: readonly string[];
  readonly imageOrigins?: readonly string[];
  readonly objectOrigins?: readonly string[];
  readonly permissionsPolicy?: string;
};

export type SecurityHeadersOptions = {
  readonly usesHttps: boolean;
  readonly apiPrefix?: string;
  readonly page?: PageSecurityPolicy;
};

export function securityHeaders(options: SecurityHeadersOptions) {
  const apiPrefix = options.apiPrefix ?? '/api';
  return (request: HttpRequest, response: HttpResponse, next: Next): void => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Permissions-Policy',
      options.page?.permissionsPolicy ?? 'camera=(), microphone=(), geolocation=()',
    );

    if (isPathBelow(request.path, apiPrefix)) {
      response.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      );
    } else {
      const nonce = randomBytes(16).toString('base64');
      const policy = pagePolicy(nonce, options.page);
      response.setHeader('Content-Security-Policy', policy);
      request.headers['content-security-policy'] = policy;
    }

    if (options.usesHttps) response.setHeader('Strict-Transport-Security', HSTS);
    next();
  };
}

export function forwardedForNotice(
  warn: (message: string) => void,
  message = 'A request carried X-Forwarded-For while trust proxy is disabled. Keep it disabled when the ' +
    'app is exposed directly; configure the exact proxy topology when a trusted reverse proxy is ' +
    'in front, otherwise per-IP controls use the proxy address.',
) {
  let said = false;
  return (request: HttpRequest, _response: HttpResponse, next: Next): void => {
    if (!said && request.headers['x-forwarded-for'] !== undefined) {
      said = true;
      warn(message);
    }
    next();
  };
}

export function readCookie(cookies: unknown, name: string): string | undefined {
  if (typeof cookies !== 'object' || cookies === null || Array.isArray(cookies)) return undefined;
  const value: unknown = Reflect.get(cookies, name);
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function originOf(request: HttpRequest): string | null {
  const origin = request.get('origin');
  if (origin !== undefined && origin !== '') return safeOrigin(origin);
  const referer = request.get('referer');
  return referer === undefined || referer === '' ? null : safeOrigin(referer);
}

function safeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function sameSiteText(value: CookieOptions['sameSite']): string {
  if (value === true || value === 'strict') return 'Strict';
  if (value === false) return 'Lax';
  return value === 'none' ? 'None' : 'Lax';
}

function assertCookiePart(value: string, label: string): void {
  if (value === '' || /[\r\n;]/.test(value)) throw new Error(`Invalid ${label}`);
}

function pagePolicy(nonce: string, policy: PageSecurityPolicy | undefined): string {
  const scripts = joinSources(policy?.scriptOrigins);
  const connections = joinSources(policy?.connectOrigins);
  const images = joinSources(policy?.imageOrigins, ['data:']);
  const objects = joinSources(policy?.objectOrigins);
  return [
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${scripts}`,
    `connect-src 'self'${connections}`,
    `img-src 'self'${images}`,
    `object-src 'self'${objects}`,
  ].join('; ');
}

function joinSources(
  values: readonly string[] | undefined,
  defaults: readonly string[] = [],
): string {
  const unique = new Set([...defaults, ...(values ?? [])].filter((value) => value !== ''));
  return unique.size === 0 ? '' : ` ${[...unique].join(' ')}`;
}

import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  clearSessionCookieHeader,
  csrfOriginCheck,
  securityHeaders,
  sessionCookieHeader,
} from './express.js';

describe('csrfOriginCheck', () => {
  const app = express();
  app.use(csrfOriginCheck({ appBaseUrl: 'https://app.example' }));
  app.post('/change', (_request, response) => response.json({ ok: true }));

  it('fails closed when an origin is absent', async () => {
    const response = await request(app).post('/change');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Request origin is missing or not allowed',
        details: null,
      },
    });
  });

  it('accepts the configured origin and safe methods', async () => {
    expect((await request(app).post('/change').set('Origin', 'https://app.example')).status).toBe(
      200,
    );
    expect((await request(app).get('/change')).status).not.toBe(403);
  });
});

describe('securityHeaders', () => {
  it('uses a strict API policy and a per-request page nonce', async () => {
    const app = express();
    app.use(securityHeaders({ usesHttps: true }));
    app.get('*path', (req, response) => {
      response.json({ policy: req.headers['content-security-policy'] ?? null });
    });

    const api = await request(app).get('/api/items');
    expect(api.headers['content-security-policy']).toContain("default-src 'none'");
    expect(api.headers['strict-transport-security']).toContain('max-age=31536000');

    const first = await request(app).get('/page');
    const second = await request(app).get('/page');
    expect(first.body.policy).toContain("script-src 'self' 'nonce-");
    expect(first.body.policy).not.toBe(second.body.policy);
  });

  it('does not trust caller-supplied CSP', async () => {
    const app = express();
    app.use(securityHeaders({ usesHttps: false }));
    app.get('*path', (req, response) =>
      response.json({ policy: req.headers['content-security-policy'] }),
    );
    const result = await request(app).get('/page').set('Content-Security-Policy', 'script-src *');
    expect(result.body.policy).not.toContain('script-src *');
  });

  it('warns only once about forwarded addresses through its dedicated middleware', async () => {
    const warn = vi.fn();
    const { forwardedForNotice } = await import('./express.js');
    const app = express();
    app.use(forwardedForNotice(warn));
    app.get('/x', (_req, res) => res.end());
    await request(app).get('/x').set('X-Forwarded-For', '203.0.113.2');
    await request(app).get('/x').set('X-Forwarded-For', '203.0.113.3');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('raw session cookie headers', () => {
  it('serializes secure session and clearing headers', () => {
    const value = sessionCookieHeader('sid', 'opaque token', {
      secure: true,
      sameSite: 'strict',
      maxAgeMs: 7_000,
    });
    expect(value).toBe('sid=opaque%20token; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=7');
    expect(clearSessionCookieHeader('sid', { secure: true, sameSite: 'strict' })).toContain(
      'Max-Age=0',
    );
  });
});

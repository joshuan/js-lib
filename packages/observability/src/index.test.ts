import { describe, expect, it } from 'vitest';
import { AsyncCallContext, correlationHeaders } from './index.js';
import { routeShapedUrl, serializeRequest, serializeResponse } from './pino.js';

describe('AsyncCallContext', () => {
  it('keeps concurrent request identifiers apart', async () => {
    const context = new AsyncCallContext();
    const values = await Promise.all([
      context.run('one', async () => {
        await Promise.resolve();
        return { current: context.current, headers: correlationHeaders() };
      }),
      context.run('two', async () => {
        await Promise.resolve();
        return { current: context.current, headers: correlationHeaders() };
      }),
    ]);
    expect(values).toEqual([
      { current: 'one', headers: { 'X-Request-Id': 'one' } },
      { current: 'two', headers: { 'X-Request-Id': 'two' } },
    ]);
    expect(context.current).toBeNull();
  });
});

describe('safe Pino serializers', () => {
  it('removes queries, identifiers, and token-shaped path segments', () => {
    expect(routeShapedUrl('/api/invites/kL9f_2Ez.4Qp7Vw8xYz?q=private')).toBe('/api/invites/:x');
    expect(routeShapedUrl('/api/documents/550e8400-e29b-41d4-a716-446655440000')).toBe(
      '/api/documents/:x',
    );
  });

  it('retains only allow-listed request headers', () => {
    expect(
      serializeRequest({
        id: 'id',
        method: 'GET',
        url: '/api/me',
        headers: {
          cookie: 'sid=secret',
          authorization: 'Bearer secret',
          origin: 'https://app.example',
          referer: 'https://app.example/reset/token',
        },
      }),
    ).toEqual({
      id: 'id',
      method: 'GET',
      url: '/api/me',
      headers: { origin: 'https://app.example' },
      remoteAddress: undefined,
      remotePort: undefined,
    });
  });

  it('drops set-cookie, location, and content-disposition responses', () => {
    expect(
      serializeResponse({
        statusCode: 302,
        headers: {
          location: 'https://bucket.example/presigned-secret',
          'set-cookie': 'sid=secret',
          'content-disposition': 'attachment; filename=private.pdf',
          'content-length': 42,
        },
      }),
    ).toEqual({ statusCode: 302, headers: { 'content-length': 42 } });
  });
});

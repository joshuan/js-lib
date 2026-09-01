import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { wireNextNest, wireNextNestStack, type NestApplicationLike } from './index.js';

describe('wireNextNestStack', () => {
  it('keeps the framework-independent middleware order around Nest init', async () => {
    const events: string[] = [];
    const nest: NestApplicationLike = {
      setGlobalPrefix(prefix) {
        events.push(`prefix:${prefix}`);
      },
      async init() {
        events.push('nest:init');
      },
    };
    const mount = {
      disablePoweredBy: () => events.push('disable'),
      root: (middleware: string) => events.push(`root:${middleware}`),
      api: (prefix: string, middleware: string) => events.push(`api:${prefix}:${middleware}`),
      apiError: (prefix: string, middleware: string) =>
        events.push(`api-error:${prefix}:${middleware}`),
      error: (middleware: string) => events.push(`error:${middleware}`),
    };

    await wireNextNestStack(nest, mount, {
      rootMiddleware: ['headers'],
      pageDispatcher: 'next',
      apiMiddleware: ['logger'],
      bodyMiddleware: ['json'],
      afterBodyErrorMiddleware: ['json-errors'],
      afterBodyMiddleware: ['parse-errors'],
      unknownRoute: 'not-found',
      errorMiddleware: ['errors'],
    });

    expect(events).toEqual([
      'prefix:api',
      'disable',
      'root:headers',
      'root:next',
      'api:/api:logger',
      'api:/api:json',
      'api-error:/api:json-errors',
      'api:/api:parse-errors',
      'nest:init',
      'api:/api:not-found',
      'error:errors',
    ]);
  });
});

describe('wireNextNest', () => {
  it('dispatches pages before Nest and leaves unknown API routes as JSON', async () => {
    const server = express();
    const events: string[] = [];
    const nest: NestApplicationLike = {
      setGlobalPrefix(prefix) {
        events.push(`prefix:${prefix}`);
      },
      async init() {
        events.push('nest:init');
        server.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }));
      },
    };
    await wireNextNest(
      server,
      nest,
      (_req, response) => {
        events.push('next');
        response.status(200).send('page');
      },
      {
        rootMiddleware: [
          (_req, response, next) => {
            response.setHeader('X-Root-Middleware', 'yes');
            next();
          },
        ],
      },
    );

    const page = await request(server).get('/settings');
    expect(page.text).toBe('page');
    expect(page.headers['x-root-middleware']).toBe('yes');
    expect((await request(server).get('/api/health')).body).toEqual({ data: { status: 'ok' } });
    const missing = await request(server).get('/api/missing');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect(events.slice(0, 2)).toEqual(['prefix:api', 'nest:init']);
  });

  it('skips body parsing only for declared raw routes', async () => {
    const server = express();
    const nest: NestApplicationLike = {
      setGlobalPrefix() {},
      async init() {
        server.post('/api/json', (req, res) => res.json({ data: req.body }));
        server.post('/api/raw', (req, res) => {
          let bytes = 0;
          req.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
          });
          req.on('end', () => res.json({ data: { bytes } }));
        });
      },
    };
    await wireNextNest(server, nest, () => {}, {
      bodyParsers: { skip: (req) => req.path === '/raw' },
    });
    expect((await request(server).post('/api/json').send({ value: 1 })).body).toEqual({
      data: { value: 1 },
    });
    expect(
      (
        await request(server)
          .post('/api/raw')
          .set('Content-Type', 'application/octet-stream')
          .send('abc')
      ).body,
    ).toEqual({ data: { bytes: 3 } });
  });
});

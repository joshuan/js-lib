import 'reflect-metadata';
import { createRequire } from 'node:module';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import type { INestApplication, NestApplicationOptions, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { errorEnvelope } from '@joshuan/http';

export type NextHandle = (request: Request, response: Response) => void | Promise<void>;

type NextApplicationLike = {
  prepare(): Promise<void>;
  getRequestHandler(): NextHandle;
  close(): Promise<void>;
};

type NextFactory = (options: {
  readonly dev: boolean;
  readonly dir: string;
}) => NextApplicationLike;

export type NestApplicationLike = {
  setGlobalPrefix(prefix: string): unknown;
  init(): Promise<unknown>;
};

export type MiddlewareMount<TMiddleware, TErrorMiddleware = TMiddleware> = {
  disablePoweredBy(): void;
  root(middleware: TMiddleware): void;
  api(prefix: string, middleware: TMiddleware): void;
  apiError(prefix: string, middleware: TErrorMiddleware): void;
  error(middleware: TErrorMiddleware): void;
};

export type MiddlewareStackOptions<TMiddleware, TErrorMiddleware = TMiddleware> = {
  readonly apiPrefix?: string;
  readonly rootMiddleware?: readonly TMiddleware[];
  readonly pageDispatcher: TMiddleware;
  readonly apiMiddleware?: readonly TMiddleware[];
  readonly bodyMiddleware?: readonly TMiddleware[];
  readonly afterBodyErrorMiddleware?: readonly TErrorMiddleware[];
  readonly afterBodyMiddleware?: readonly TMiddleware[];
  readonly unknownRoute: TMiddleware;
  readonly errorMiddleware?: readonly TErrorMiddleware[];
};

// The ordering is the invariant. Express-major-specific handler types and parser factories stay in
// the consumer so one package can wire Express 4 and 5 without leaking either type universe.
export async function wireNextNestStack<TMiddleware, TErrorMiddleware = TMiddleware>(
  nestApplication: NestApplicationLike,
  mount: MiddlewareMount<TMiddleware, TErrorMiddleware>,
  options: MiddlewareStackOptions<TMiddleware, TErrorMiddleware>,
): Promise<void> {
  const apiPrefix = normalizePrefix(options.apiPrefix ?? '/api');
  nestApplication.setGlobalPrefix(apiPrefix.slice(1));
  mount.disablePoweredBy();

  for (const middleware of options.rootMiddleware ?? []) mount.root(middleware);
  mount.root(options.pageDispatcher);
  for (const middleware of options.apiMiddleware ?? []) mount.api(apiPrefix, middleware);
  for (const middleware of options.bodyMiddleware ?? []) mount.api(apiPrefix, middleware);
  for (const middleware of options.afterBodyErrorMiddleware ?? []) {
    mount.apiError(apiPrefix, middleware);
  }
  for (const middleware of options.afterBodyMiddleware ?? []) mount.api(apiPrefix, middleware);

  await nestApplication.init();

  mount.api(apiPrefix, options.unknownRoute);
  for (const middleware of options.errorMiddleware ?? []) mount.error(middleware);
}

export type BodyParserOptions = {
  readonly jsonLimit?: string | number;
  readonly skip?: (request: Request) => boolean;
  readonly urlencoded?: boolean;
};

export type WireOptions = {
  readonly apiPrefix?: string;
  readonly isBackendPath?: (request: Request) => boolean;
  readonly rootMiddleware?: readonly RequestHandler[];
  readonly apiMiddleware?: readonly RequestHandler[];
  readonly bodyParsers?: false | BodyParserOptions;
  readonly afterBodyParsers?: readonly RequestHandler[];
  readonly errorMiddleware?: readonly ErrorRequestHandler[];
  readonly unknownRoute?: { readonly code?: string; readonly message?: string };
};

export async function wireNextNest(
  server: Express,
  nestApplication: NestApplicationLike,
  nextHandle: NextHandle,
  options: WireOptions = {},
): Promise<void> {
  const apiPrefix = normalizePrefix(options.apiPrefix ?? '/api');
  const isBackendPath =
    options.isBackendPath ?? ((request: Request) => isPathBelow(request.path, apiPrefix));

  nestApplication.setGlobalPrefix(apiPrefix.slice(1));
  server.disable('x-powered-by');

  for (const middleware of options.rootMiddleware ?? []) server.use(middleware);

  server.use((request, response, forward) => {
    if (isBackendPath(request)) {
      forward();
      return;
    }
    Promise.resolve(nextHandle(request, response)).catch(forward);
  });

  for (const middleware of options.apiMiddleware ?? []) server.use(apiPrefix, middleware);

  if (options.bodyParsers !== false) {
    const parserOptions = options.bodyParsers ?? {};
    const skip = parserOptions.skip ?? (() => false);
    const jsonParser = express.json({ limit: parserOptions.jsonLimit ?? '1mb' });
    server.use(apiPrefix, (request, response, forward) =>
      skip(request) ? forward() : jsonParser(request, response, forward),
    );
    if (parserOptions.urlencoded !== false) {
      const formParser = express.urlencoded({ extended: true });
      server.use(apiPrefix, (request, response, forward) =>
        skip(request) ? forward() : formParser(request, response, forward),
      );
    }
  }

  for (const middleware of options.afterBodyParsers ?? []) server.use(apiPrefix, middleware);

  await nestApplication.init();

  const unknown = options.unknownRoute ?? {};
  server.use(apiPrefix, (_request, response) => {
    response
      .status(404)
      .json(errorEnvelope(unknown.code ?? 'NOT_FOUND', unknown.message ?? 'Unknown API route'));
  });
  for (const middleware of options.errorMiddleware ?? []) server.use(middleware);
}

export type BootstrapOptions = WireOptions & {
  readonly rootModule: Type<unknown>;
  readonly dev: boolean;
  readonly port: number;
  readonly directory?: string;
  readonly trustProxy?: string | number | boolean;
  readonly nestOptions?: Omit<NestApplicationOptions, 'bodyParser'>;
  readonly configureNest?: (application: INestApplication) => void | Promise<void>;
  readonly beforeListen?: (application: INestApplication) => void | Promise<void>;
  readonly onListening?: (application: INestApplication, port: number) => void;
};

export type RunningApplication = {
  readonly nest: INestApplication;
  readonly server: Express;
  readonly listener: Server;
  readonly port: number;
  close(): Promise<void>;
};

export async function bootstrapNextNest(options: BootstrapOptions): Promise<RunningApplication> {
  const server = express();
  if (options.trustProxy !== undefined && options.trustProxy !== false) {
    server.set('trust proxy', options.trustProxy);
  }

  const nextApplication = loadNext()({
    dev: options.dev,
    dir: options.directory ?? process.cwd(),
  });
  await nextApplication.prepare();
  const nextHandle = nextApplication.getRequestHandler();

  const nestApplication = await NestFactory.create(options.rootModule, new ExpressAdapter(server), {
    ...options.nestOptions,
    bodyParser: false,
  });
  await options.configureNest?.(nestApplication);
  await wireNextNest(server, nestApplication, nextHandle, options);
  await options.beforeListen?.(nestApplication);

  const listener = server.listen(options.port);
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', resolve);
    listener.once('error', reject);
  });
  options.onListening?.(nestApplication, options.port);

  let closing: Promise<void> | null = null;
  const close = (): Promise<void> => {
    closing ??= closeAll(listener, nestApplication, nextApplication);
    return closing;
  };
  return { nest: nestApplication, server, listener, port: options.port, close };
}

function loadNext(): NextFactory {
  const requireFromApplication = createRequire(resolve(process.cwd(), 'package.json'));
  const loaded: unknown = requireFromApplication('next');
  if (isNextFactory(loaded)) return loaded;
  if (isObject(loaded) && isNextFactory(loaded.default)) return loaded.default;
  throw new TypeError('The installed next package does not export a server factory');
}

function isNextFactory(value: unknown): value is NextFactory {
  return typeof value === 'function';
}

function isObject(value: unknown): value is { readonly default?: unknown } {
  return typeof value === 'object' && value !== null;
}

export function installSignalShutdown(application: Pick<RunningApplication, 'close'>): () => void {
  const shutdown = (): void => {
    void application.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return () => {
    process.off('SIGINT', shutdown);
    process.off('SIGTERM', shutdown);
  };
}

function normalizePrefix(prefix: string): string {
  const withSlash = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

function isPathBelow(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

async function closeAll(
  listener: Server,
  nestApplication: INestApplication,
  nextApplication: { close(): Promise<void> },
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    listener.close((error) => (error === undefined ? resolve() : reject(error)));
  });
  await nestApplication.close();
  await nextApplication.close();
}

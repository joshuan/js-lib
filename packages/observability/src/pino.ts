import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Logger } from 'pino';
import type { AuditEvents, CallContext } from './index.js';

const ROUTE_LITERAL = /^[a-z][a-z-]{0,23}$/;
const OPAQUE_SEGMENT = ':x';
const REQUEST_HEADERS = ['content-type', 'content-length', 'user-agent', 'origin'] as const;
const RESPONSE_HEADERS = ['content-type', 'content-length', 'retry-after'] as const;

export function routeShapedUrl(url: string): string {
  const queryAt = url.indexOf('?');
  const path = queryAt === -1 ? url : url.slice(0, queryAt);
  return path
    .split('/')
    .map((segment) => (segment === '' || ROUTE_LITERAL.test(segment) ? segment : OPAQUE_SEGMENT))
    .join('/');
}

type SerializedRequest = {
  readonly id?: string | number;
  readonly method?: string;
  readonly url?: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly remoteAddress?: string;
  readonly remotePort?: number;
};

type SerializedResponse = {
  readonly statusCode?: number;
  readonly headers: Record<string, string | string[] | number | undefined>;
};

export function serializeRequest(request: SerializedRequest) {
  const headers: Record<string, string | string[]> = {};
  for (const name of REQUEST_HEADERS) {
    const value = request.headers[name];
    if (value !== undefined) headers[name] = value;
  }
  return {
    id: request.id,
    method: request.method,
    url: routeShapedUrl(request.url ?? ''),
    headers,
    remoteAddress: request.remoteAddress,
    remotePort: request.remotePort,
  };
}

export function serializeResponse(response: SerializedResponse) {
  const headers: Record<string, string | string[] | number> = {};
  for (const name of RESPONSE_HEADERS) {
    const value = response.headers[name];
    if (value !== undefined) headers[name] = value;
  }
  return { statusCode: response.statusCode, headers };
}

export type RequestLoggerOptions = {
  readonly level: string;
  readonly development?: boolean;
  readonly prettyTarget?: string;
};

export type PinoHttpOptions = {
  readonly level: string;
  readonly genReqId: (request: IncomingMessage, response: ServerResponse) => string;
  readonly serializers: {
    readonly req: typeof serializeRequest;
    readonly res: typeof serializeResponse;
  };
  readonly transport?: { readonly target: string };
};

export function buildPinoHttpOptions(options: RequestLoggerOptions): PinoHttpOptions {
  const base: PinoHttpOptions = {
    level: options.level,
    genReqId: (_request: IncomingMessage, response: ServerResponse): string => {
      const id = randomUUID();
      response.setHeader('X-Request-Id', id);
      return id;
    },
    serializers: {
      req: serializeRequest,
      res: serializeResponse,
    },
  };
  return options.development === true
    ? {
        ...base,
        transport: { target: options.prettyTarget ?? 'pino-pretty' },
      }
    : base;
}

export class PinoAuditEvents<
  TEvent extends { readonly event: string },
> implements AuditEvents<TEvent> {
  constructor(
    private readonly logger: Logger,
    private readonly context: CallContext,
    private readonly serialize: (event: TEvent) => Readonly<Record<string, unknown>>,
  ) {}

  record(event: TEvent): void {
    this.logger.info(
      { ...this.serialize(event), event: event.event, requestId: this.context.current },
      `security.${event.event}`,
    );
  }
}

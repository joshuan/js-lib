import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage<string>();

export abstract class CallContext {
  abstract run<T>(requestId: string, work: () => T): T;
  abstract get current(): string | null;
}

export class AsyncCallContext extends CallContext {
  run<T>(requestId: string, work: () => T): T {
    return storage.run(requestId, work);
  }

  get current(): string | null {
    return storage.getStore() ?? null;
  }
}

export function correlationHeaders(): Record<string, string> {
  const requestId = storage.getStore();
  return requestId === undefined ? {} : { 'X-Request-Id': requestId };
}

export type AuditEvent<
  TName extends string,
  TActor extends object,
  TTarget extends object,
  TDetail extends object,
> = {
  readonly event: TName;
  readonly actor: TActor;
  readonly target: TTarget;
  readonly detail?: TDetail;
};

export abstract class AuditEvents<TEvent> {
  abstract record(event: TEvent): void;
}

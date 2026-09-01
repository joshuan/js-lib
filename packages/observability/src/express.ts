export type RequestWithId = { readonly id?: unknown };
export type Next = () => void;
export type HttpCallContext = {
  run<T>(requestId: string, work: () => Promise<T>): Promise<T>;
};

export function callContextMiddleware(context: HttpCallContext) {
  return (request: RequestWithId, _response: unknown, next: Next): void => {
    const requestId: unknown = request.id;
    if (typeof requestId !== 'string' || requestId === '') {
      next();
      return;
    }
    void context.run(requestId, () => {
      next();
      return Promise.resolve();
    });
  };
}

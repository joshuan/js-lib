import { CaptchaVerifier } from '@joshuan/auth-core';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileOptions = {
  readonly secretKey: string;
  readonly timeoutMs?: number;
  readonly maxResponseBytes?: number;
  readonly fetch?: typeof fetch;
};

export class NoopCaptchaVerifier extends CaptchaVerifier {
  get configured(): boolean {
    return false;
  }
  verify(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export class TurnstileCaptchaVerifier extends CaptchaVerifier {
  private readonly fetchImplementation: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;

  constructor(private readonly options: TurnstileOptions) {
    super();
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.maxResponseBytes = options.maxResponseBytes ?? 64 * 1024;
  }

  get configured(): boolean {
    return this.options.secretKey !== '';
  }

  async verify(token: string | undefined, ip: string | undefined): Promise<boolean> {
    if (!this.configured) return true;
    if (token === undefined || token === '') return false;
    const body = new URLSearchParams({ secret: this.options.secretKey, response: token });
    if (ip !== undefined && ip !== '') body.set('remoteip', ip);
    try {
      const response = await this.fetchImplementation(VERIFY_URL, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: 'error',
      });
      if (!response.ok) return false;
      const value = await readBoundedJson(response, this.maxResponseBytes);
      return isRecord(value) && value.success === true;
    } catch {
      return false;
    }
  }
}

async function readBoundedJson(response: Response, limit: number): Promise<unknown> {
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > limit) throw new Error('Response is too large');
  if (response.body === null) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    const value: unknown = item.value;
    if (!(value instanceof Uint8Array)) throw new Error('Response body is not bytes');
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel();
      throw new Error('Response is too large');
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(merged));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

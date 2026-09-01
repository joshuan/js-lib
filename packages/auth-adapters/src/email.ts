import nodemailer, { type Transporter } from 'nodemailer';
import { EmailSender, type EmailMessage } from '@joshuan/auth-core';

export type SmtpOptions = {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user?: string | null;
  readonly password?: string | null;
  readonly from: string;
  readonly allowPlaintext?: boolean;
  readonly tlsFailureMessage?: (failure: SmtpTlsFailure) => string;
};

export type SmtpTlsFailure = {
  readonly host: string;
  readonly port: number;
  readonly cause: unknown;
};

export type SmtpTransportOptions = {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly requireTLS?: boolean;
  readonly auth?: { readonly user: string; readonly pass: string };
};

export function smtpTransportOptions(options: SmtpOptions): SmtpTransportOptions {
  return {
    host: options.host,
    port: options.port,
    secure: options.secure,
    ...(!options.secure && options.allowPlaintext !== true ? { requireTLS: true } : {}),
    ...(options.user === undefined || options.user === null || options.user === ''
      ? {}
      : { auth: { user: options.user, pass: options.password ?? '' } }),
  };
}

export class SmtpEmailSender extends EmailSender {
  private readonly transporter: Transporter;

  constructor(private readonly options: SmtpOptions) {
    super();
    this.transporter = nodemailer.createTransport(smtpTransportOptions(options));
  }

  get available(): boolean {
    return true;
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({ ...message, from: this.options.from });
    } catch (error) {
      const requiresTls = !this.options.secure && this.options.allowPlaintext !== true;
      if (requiresTls && isTlsFailure(error) && this.options.tlsFailureMessage !== undefined) {
        throw new Error(
          this.options.tlsFailureMessage({
            host: this.options.host,
            port: this.options.port,
            cause: error,
          }),
          { cause: error },
        );
      }
      throw error;
    }
  }
}

export function isTlsFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code: unknown = error.code;
  if (code === 'ETLS') return true;
  return code === 'ECONNECTION' && /STARTTLS/i.test(describe(error));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class SafeLogEmailSender extends EmailSender {
  constructor(
    private readonly log: (record: { readonly to: string; readonly subject: string }) => void,
  ) {
    super();
  }

  get available(): boolean {
    return false;
  }

  send(message: EmailMessage): Promise<void> {
    this.log({ to: message.to, subject: message.subject });
    return Promise.resolve();
  }
}

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { SessionTokens, VerificationTokens } from '@joshuan/auth-core';

export class CryptoSessionTokens extends SessionTokens {
  issue(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

export class HmacVerificationTokens extends VerificationTokens {
  constructor(private readonly secret: string) {
    super();
    if (Buffer.byteLength(secret) < 32)
      throw new Error('Verification secret must be at least 32 bytes');
  }

  issueCode(): { code: string; hash: string } {
    const code = this.generateCode();
    return { code, hash: this.hash(code) };
  }

  verifyCode(hash: string, code: string): boolean {
    return this.matchesCode(hash, code);
  }

  generateCode(length = 6): string {
    if (!Number.isSafeInteger(length) || length < 1 || length > 12) {
      throw new Error('Verification code length must be an integer from 1 through 12');
    }
    return randomInt(0, 10 ** length)
      .toString()
      .padStart(length, '0');
  }

  hashCode(code: string): string {
    return this.hash(code);
  }

  matchesCode(hash: string, code: string): boolean {
    return safeEqualHex(hash, this.hash(code));
  }

  generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }

  issueTicket(): { ticket: string; hash: string } {
    const ticket = this.generateToken();
    return { ticket, hash: this.hashTicket(ticket) };
  }

  hashTicket(ticket: string): string {
    return this.hash(ticket);
  }
}

export function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right) || left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

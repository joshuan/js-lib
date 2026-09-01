import { randomUUID } from 'node:crypto';
import { AuthUnavailableError, Clock } from '@joshuan/auth-core';

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

export class UuidGenerator {
  next(): string {
    return randomUUID();
  }
}

export class ConcurrencyGate {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(
    private readonly concurrency: number,
    private readonly maxQueued: number,
  ) {
    if (!Number.isSafeInteger(concurrency) || concurrency <= 0) {
      throw new Error('Concurrency must be a positive integer');
    }
    if (!Number.isSafeInteger(maxQueued) || maxQueued < 0) {
      throw new Error('Maximum queue length must be a non-negative integer');
    }
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    await this.enter();
    try {
      return await work();
    } finally {
      this.leave();
    }
  }

  private enter(): Promise<void> {
    if (this.active < this.concurrency) {
      this.active += 1;
      return Promise.resolve();
    }
    if (this.queue.length >= this.maxQueued) {
      return Promise.reject(new AuthUnavailableError('Password hashing capacity is exhausted'));
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private leave(): void {
    this.active -= 1;
    this.queue.shift()?.();
  }
}

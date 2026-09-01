import {
  Body,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Query,
  type ArgumentsHost,
  type ExceptionFilter,
  type PipeTransform,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiErrorMapper,
  errorEnvelope,
  type SafeParseSchema,
  type ValidationFailure,
} from './index.js';

export class RequestValidationError extends Error {
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly code = 'VALIDATION_FAILED';

  constructor(readonly issues: readonly unknown[]) {
    super('Request validation failed');
    this.name = 'RequestValidationError';
  }
}

@Injectable()
export class SchemaValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: SafeParseSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) throw new RequestValidationError(issuesOf(result));
    return result.data;
  }
}

export function ValidatedBody<T>(schema: SafeParseSchema<T>): ParameterDecorator {
  return Body(new SchemaValidationPipe(schema));
}

export function ValidatedQuery<T>(schema: SafeParseSchema<T>): ParameterDecorator {
  return Query(new SchemaValidationPipe(schema));
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  constructor(private readonly mapper: ApiErrorMapper) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = this.mapper.map(exception);
    if (mapped !== null) {
      response
        .status(mapped.status)
        .json(errorEnvelope(mapped.code, mapped.message, mapped.details ?? null));
      return;
    }

    if (exception instanceof RequestValidationError) {
      response
        .status(exception.status)
        .json(errorEnvelope(exception.code, exception.message, { issues: exception.issues }));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const [code, message] = builtInError(status);
      response.status(status).json(errorEnvelope(code, message));
      return;
    }

    this.logger.error('Unhandled exception', exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorEnvelope('INTERNAL', 'Internal server error'));
  }
}

function issuesOf(result: ValidationFailure): readonly unknown[] {
  return result.error.issues;
}

function builtInError(status: number): readonly [string, string] {
  if (status === Number(HttpStatus.UNAUTHORIZED))
    return ['UNAUTHENTICATED', 'Authentication required'];
  if (status === Number(HttpStatus.FORBIDDEN)) return ['FORBIDDEN', 'Forbidden'];
  if (status === Number(HttpStatus.NOT_FOUND)) return ['NOT_FOUND', 'Unknown API route'];
  if (status === Number(HttpStatus.TOO_MANY_REQUESTS)) return ['RATE_LIMITED', 'Too many requests'];
  if (status === Number(HttpStatus.UNPROCESSABLE_ENTITY)) {
    return ['VALIDATION_FAILED', 'Request validation failed'];
  }
  return ['INTERNAL', 'Internal server error'];
}

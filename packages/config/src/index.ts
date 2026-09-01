export type ConfigIssue = {
  readonly path?: readonly PropertyKey[];
  readonly message: string;
};

export type ParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly issues: readonly ConfigIssue[] };

export type ConfigParser<T> = (input: Readonly<Record<string, unknown>>) => ParseResult<T>;

export type RenamedKey<T extends object> = {
  readonly now: keyof T;
  readonly before: string;
};

export type ConfigPolicy<T extends object> = (values: Readonly<T>) => readonly string[];

export type ConfigDefinition<T extends object> = {
  readonly parse: ConfigParser<T>;
  readonly renamedKeys?: readonly RenamedKey<T>[];
  readonly isProduction?: (values: Readonly<T>) => boolean;
  readonly checks?: readonly ConfigPolicy<T>[];
  readonly productionChecks?: readonly ConfigPolicy<T>[];
  readonly warnings?: readonly ConfigPolicy<T>[];
  readonly invalidHeading?: string;
  readonly refusalHeading?: string;
};

export class ConfigurationError extends Error {
  constructor(
    readonly heading: string,
    readonly problems: readonly string[],
  ) {
    super(`${heading}:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    this.name = 'ConfigurationError';
  }
}

export class TypedConfig<T extends object> {
  constructor(
    private readonly values: Readonly<T>,
    private readonly supplied: ReadonlySet<PropertyKey> = new Set(),
  ) {}

  get<K extends keyof T>(key: K): T[K] {
    return this.values[key];
  }

  isFromEnvironment(key: keyof T): boolean {
    return this.supplied.has(key);
  }

  snapshot(): Readonly<T> {
    return this.values;
  }

  get environmentKeys(): ReadonlySet<PropertyKey> {
    return this.supplied;
  }
}

export type ConfigLoader<T extends object> = {
  readonly load: (environment?: Readonly<Record<string, unknown>>) => TypedConfig<T>;
  readonly warningsFor: (config: TypedConfig<T>) => readonly string[];
};

export function defineConfig<T extends object>(definition: ConfigDefinition<T>): ConfigLoader<T> {
  const load = (environment: Readonly<Record<string, unknown>> = process.env): TypedConfig<T> => {
    const resolved = resolveRenamedKeys(environment, definition.renamedKeys ?? []);
    const result = definition.parse(resolved);
    if (!result.success) {
      throw new ConfigurationError(
        definition.invalidHeading ?? 'Invalid environment configuration',
        result.issues.map(formatIssue),
      );
    }

    const failures = collect(definition.checks, result.data);
    if (definition.isProduction?.(result.data) === true) {
      failures.push(...collect(definition.productionChecks, result.data));
    }
    if (failures.length > 0) {
      throw new ConfigurationError(definition.refusalHeading ?? 'Refusing to start', failures);
    }

    return new TypedConfig(result.data, suppliedKeys(result.data, resolved));
  };

  return {
    load,
    warningsFor: (config) => collect(definition.warnings, config.snapshot()),
  };
}

export function optionalTrimmed(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export function environmentBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new ConfigurationError('Invalid environment configuration', [
    `expected a boolean, received ${JSON.stringify(value)}`,
  ]);
}

export function parseDuration(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value.trim());
  if (match === null) {
    throw new ConfigurationError('Invalid duration', [
      `${JSON.stringify(value)} must look like 500ms, 30s, 15m, 24h, or 30d`,
    ]);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === 'ms'
      ? 1
      : unit === 's'
        ? 1_000
        : unit === 'm'
          ? 60_000
          : unit === 'h'
            ? 3_600_000
            : 86_400_000;
  return amount * multiplier;
}

function collect<T extends object>(
  policies: readonly ConfigPolicy<T>[] | undefined,
  values: Readonly<T>,
): string[] {
  return policies?.flatMap((policy) => policy(values)) ?? [];
}

function formatIssue(issue: ConfigIssue): string {
  const path = issue.path?.map(String).join('.') ?? '';
  return path === '' ? issue.message : `${path}: ${issue.message}`;
}

function resolveRenamedKeys<T extends object>(
  environment: Readonly<Record<string, unknown>>,
  renamedKeys: readonly RenamedKey<T>[],
): Record<string, unknown> {
  const resolved = { ...environment };
  for (const { now, before } of renamedKeys) {
    const current = String(now);
    if (!hasValue(resolved[current]) && hasValue(environment[before])) {
      resolved[current] = environment[before];
    }
  }
  return resolved;
}

function suppliedKeys<T extends object>(
  values: Readonly<T>,
  environment: Readonly<Record<string, unknown>>,
): ReadonlySet<PropertyKey> {
  const supplied = new Set<PropertyKey>();
  for (const key of Reflect.ownKeys(values)) {
    if (hasValue(environment[String(key)])) supplied.add(key);
  }
  return supplied;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

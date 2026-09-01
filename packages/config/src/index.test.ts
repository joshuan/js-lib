import { describe, expect, it } from 'vitest';
import {
  ConfigurationError,
  defineConfig,
  environmentBoolean,
  parseDuration,
  type ParseResult,
} from './index.js';

type Values = { NODE_ENV: 'development' | 'production'; SECRET: string; CURRENT: string };

function parse(input: Readonly<Record<string, unknown>>): ParseResult<Values> {
  const nodeEnv = input.NODE_ENV ?? 'development';
  const secret = input.SECRET;
  const current = input.CURRENT ?? '';
  if ((nodeEnv !== 'development' && nodeEnv !== 'production') || typeof secret !== 'string') {
    return { success: false, issues: [{ path: ['SECRET'], message: 'is required' }] };
  }
  return { success: true, data: { NODE_ENV: nodeEnv, SECRET: secret, CURRENT: String(current) } };
}

describe('defineConfig', () => {
  const definition = defineConfig<Values>({
    parse,
    renamedKeys: [{ now: 'CURRENT', before: 'OLD' }],
    isProduction: (values) => values.NODE_ENV === 'production',
    productionChecks: [(values) => (values.SECRET === 'example' ? ['SECRET is an example'] : [])],
    warnings: [(values) => (values.CURRENT === '' ? ['CURRENT uses its default'] : [])],
  });

  it('resolves renamed keys and records their provenance', () => {
    const config = definition.load({ SECRET: 'safe', OLD: 'legacy' });
    expect(config.get('CURRENT')).toBe('legacy');
    expect(config.isFromEnvironment('CURRENT')).toBe(true);
  });

  it('collects production refusals', () => {
    expect(() => definition.load({ NODE_ENV: 'production', SECRET: 'example' })).toThrowError(
      /Refusing to start:\n {2}- SECRET is an example/,
    );
  });

  it('keeps warnings outside parsing', () => {
    expect(definition.warningsFor(definition.load({ SECRET: 'safe' }))).toEqual([
      'CURRENT uses its default',
    ]);
  });

  it('formats parser failures', () => {
    expect(() => definition.load({})).toThrowError(/SECRET: is required/);
  });
});

describe('configuration primitives', () => {
  it('parses strict booleans', () => {
    expect(environmentBoolean('1')).toBe(true);
    expect(environmentBoolean('false')).toBe(false);
    expect(() => environmentBoolean('yes')).toThrow(ConfigurationError);
  });

  it('parses durations without accepting suffix garbage', () => {
    expect(parseDuration('30d')).toBe(2_592_000_000);
    expect(parseDuration('500ms')).toBe(500);
    expect(() => parseDuration('30days')).toThrow(ConfigurationError);
  });
});

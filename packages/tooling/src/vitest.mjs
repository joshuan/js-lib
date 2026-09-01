import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export function createNextVitestConfig(options = {}) {
  const root = options.rootDirectory ?? process.cwd();
  const common = {
    globals: options.globals ?? true,
    setupFiles: options.setupFiles ?? [],
    testTimeout: options.testTimeout ?? 20_000,
    hookTimeout: options.hookTimeout ?? 20_000,
  };
  return defineConfig({
    test: {
      projects: options.projects ?? [
        {
          test: {
            ...common,
            name: 'node',
            environment: 'node',
            include: options.nodeInclude ?? ['src/**/*.test.ts'],
          },
        },
        {
          test: {
            ...common,
            name: 'web',
            environment: 'jsdom',
            include: options.webInclude ?? ['src/**/*.test.tsx'],
          },
        },
      ],
    },
    ...(options.aliases === undefined
      ? {}
      : {
          resolve: {
            alias: Object.fromEntries(
              Object.entries(options.aliases).map(([name, path]) => [name, resolve(root, path)]),
            ),
          },
        }),
  });
}

export function createNestNextVitestConfig(options = {}) {
  const root = options.rootDirectory ?? process.cwd();
  const swcConfig = JSON.parse(readFileSync(resolve(root, options.swcrc ?? '.swcrc'), 'utf8'));
  const jsc =
    swcConfig.jsc?.baseUrl === undefined
      ? swcConfig.jsc
      : { ...swcConfig.jsc, baseUrl: resolve(root, swcConfig.jsc.baseUrl) };
  const plugin = () => swc.vite({ jsc, module: swcConfig.module });
  const timeouts = {
    testTimeout: options.testTimeout ?? 20_000,
    hookTimeout: options.hookTimeout ?? 20_000,
  };
  const projects = options.projects?.map((project) => ({
    ...project,
    plugins: [plugin(), ...(project.plugins ?? [])],
  })) ?? [
    {
      plugins: [plugin()],
      test: {
        name: 'server',
        environment: 'node',
        globals: true,
        ...timeouts,
        pool: 'forks',
        setupFiles: options.serverSetupFiles ?? [],
        include: options.serverInclude ?? [
          'server/**/*.test.ts',
          'src/server/**/*.test.ts',
          'src/shared/**/*.test.ts',
          'test/**/*.test.ts',
        ],
      },
    },
    {
      plugins: [plugin()],
      test: {
        name: 'web',
        environment: 'jsdom',
        globals: true,
        ...timeouts,
        pool: 'threads',
        setupFiles: options.webSetupFiles ?? [],
        include: options.webInclude ?? ['src/web/**/*.test.{ts,tsx}', 'src/app/**/*.test.{ts,tsx}'],
      },
    },
  ];

  return defineConfig({
    test: {
      fileParallelism: options.fileParallelism ?? false,
      ...(options.coverage === undefined ? {} : { coverage: options.coverage }),
      projects,
    },
  });
}

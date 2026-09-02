import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import boundaries from 'eslint-plugin-boundaries';
import react from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const DEFAULT_FRAMEWORK_PACKAGES = [
  '@nestjs/*',
  '@prisma/client',
  'prisma',
  'express',
  'next',
  'next/*',
  'pg-boss',
  '@aws-sdk/*',
  'argon2',
  'nodemailer',
  'sharp',
  'multer',
];

export function createApplicationEslintConfig(options = {}) {
  const root = options.rootDirectory ?? process.cwd();
  const projects = options.projects ?? [
    './tsconfig.json',
    './tsconfig.server.json',
    './tsconfig.test.json',
  ];
  const webFiles = options.webFiles ?? ['src/web/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'];
  const frameworkPackages = [
    ...DEFAULT_FRAMEWORK_PACKAGES,
    ...(options.additionalFrameworkPackages ?? []),
  ];
  const innerLayerPatterns = [
    {
      group: frameworkPackages,
      message: 'domain/application must stay framework-free; depend on ports instead.',
    },
    ...(options.enforceLayerDirection === false
      ? []
      : [
          {
            group: ['**/infrastructure/**', '**/presentation/**'],
            message: 'Inner layers must not import outer layers.',
          },
        ]),
  ];

  const fsd =
    options.fsd === false
      ? []
      : [
          {
            files: webFiles,
            plugins: { boundaries },
            settings: {
              'boundaries/include': ['src/web/**/*', 'src/app/**/*', 'src/shared/**/*'],
              'boundaries/elements': [
                { type: 'contracts', pattern: 'src/shared/contracts/**/*', partialMatch: false },
                { type: 'app', pattern: 'src/app/**/*', partialMatch: false },
                { type: 'screens', pattern: 'src/web/screens/**/*', partialMatch: false },
                { type: 'widgets', pattern: 'src/web/widgets/**/*', partialMatch: false },
                { type: 'features', pattern: 'src/web/features/**/*', partialMatch: false },
                { type: 'entities', pattern: 'src/web/entities/**/*', partialMatch: false },
                { type: 'shared', pattern: 'src/web/shared/**/*', partialMatch: false },
              ],
            },
            rules: {
              'boundaries/dependencies': [
                'error',
                {
                  default: 'disallow',
                  policies: [
                    {
                      from: { element: { type: 'app' } },
                      allow: {
                        to: {
                          element: {
                            types: {
                              anyOf: [
                                'app',
                                'screens',
                                'widgets',
                                'features',
                                'entities',
                                'shared',
                                'contracts',
                              ],
                            },
                          },
                        },
                      },
                    },
                    {
                      from: { element: { type: 'screens' } },
                      allow: {
                        to: {
                          element: {
                            types: {
                              anyOf: [
                                'screens',
                                'widgets',
                                'features',
                                'entities',
                                'shared',
                                'contracts',
                              ],
                            },
                          },
                        },
                      },
                    },
                    {
                      from: { element: { type: 'widgets' } },
                      allow: {
                        to: {
                          element: {
                            types: {
                              anyOf: ['widgets', 'features', 'entities', 'shared', 'contracts'],
                            },
                          },
                        },
                      },
                    },
                    {
                      from: { element: { type: 'features' } },
                      allow: {
                        to: {
                          element: {
                            types: { anyOf: ['features', 'entities', 'shared', 'contracts'] },
                          },
                        },
                      },
                    },
                    {
                      from: { element: { type: 'entities' } },
                      allow: {
                        to: {
                          element: { types: { anyOf: ['entities', 'shared', 'contracts'] } },
                        },
                      },
                    },
                    {
                      from: { element: { type: 'shared' } },
                      allow: {
                        to: { element: { types: { anyOf: ['shared', 'contracts'] } } },
                      },
                    },
                  ],
                },
              ],
            },
          },
        ];

  return tseslint.config(
    {
      ignores: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        'next-env.d.ts',
        'prisma/generated/**',
        ...(options.ignores ?? []),
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked.map((config) => ({
      ...config,
      files: ['server/**/*.ts', 'src/**/*.{ts,tsx}', 'prisma/**/*.ts', 'test/**/*.{ts,tsx}'],
    })),
    {
      files: ['server/**/*.ts', 'src/**/*.{ts,tsx}', 'prisma/**/*.ts', 'test/**/*.{ts,tsx}'],
      languageOptions: {
        parserOptions: { project: projects, tsconfigRootDir: root },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
        'no-console': 'warn',
      },
    },
    {
      files: ['src/server/domain/**/*.ts', 'src/server/application/**/*.ts'],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: innerLayerPatterns,
          },
        ],
      },
    },
    {
      files: ['src/shared/contracts/**/*.ts'],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                regex: '^(?!zod$|vitest$|\\./|\\.\\./)',
                message:
                  'Shared contracts may only depend on zod, vitest tests, and relative modules.',
              },
            ],
          },
        ],
      },
    },
    ...fsd,
    {
      files: webFiles,
      ...react.configs['recommended-type-checked'],
    },
    {
      files: webFiles,
      plugins: { 'react-hooks': reactHooks, '@next/next': nextPlugin },
      languageOptions: { globals: globals.browser },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        ...nextPlugin.configs['core-web-vitals'].rules,
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
    {
      files: ['server/**/*.ts', 'src/server/**/*.ts'],
      languageOptions: { globals: globals.node },
      rules: { 'no-console': 'error' },
    },
    {
      files: ['**/*.test.{ts,tsx}', 'test/**/*.{ts,tsx}'],
      rules: {
        '@eslint-react/hooks-extra/no-unnecessary-use-prefix': 'off',
        ...(options.testRules ?? {}),
      },
    },
    {
      files: ['**/*.mjs', '**/*.js', '**/*.cjs', '**/*.config.{ts,mjs}'],
      languageOptions: { globals: globals.node },
      rules: { 'no-console': 'off' },
    },
    importX.flatConfigs.recommended,
    importX.flatConfigs.typescript,
    {
      rules: {
        'import-x/no-unresolved': 'off',
        'import-x/namespace': 'off',
        'import-x/default': 'off',
        'import-x/no-named-as-default': 'off',
        'import-x/no-named-as-default-member': 'off',
      },
    },
    ...(options.additionalConfigs ?? []),
    prettier,
  );
}

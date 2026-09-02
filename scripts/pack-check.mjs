import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const workspacePattern = manifest.workspaces[0];
if (workspacePattern !== 'packages/*') throw new Error('pack-check expects packages/* workspaces');

const workspaceOutput = execFileSync('npm', ['query', '.workspace'], {
  cwd: root,
  encoding: 'utf8',
});
const workspaces = JSON.parse(workspaceOutput)
  .filter((workspace) => workspace.private !== true)
  .sort((left, right) => left.name.localeCompare(right.name));

const temporary = await mkdtemp(resolve(tmpdir(), 'joshuan-pack-check-'));
try {
  const tarballs = [];
  for (const workspace of workspaces) {
    const packed = JSON.parse(
      execFileSync('npm', ['pack', '--json', '--pack-destination', temporary], {
        cwd: workspace.path,
        encoding: 'utf8',
      }),
    );
    const filename = packed[0]?.filename;
    if (typeof filename !== 'string')
      throw new Error(`npm pack returned no file for ${workspace.name}`);
    tarballs.push(resolve(temporary, filename));
  }

  await writeFile(
    resolve(temporary, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }, null, 2),
  );
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--package-lock=false', ...tarballs], {
    cwd: temporary,
    stdio: 'inherit',
  });

  await writeFile(
    resolve(temporary, 'esm.mjs'),
    [
      "await import('@joshuan/config');",
      "await import('@joshuan/http');",
      "await import('@joshuan/http/express');",
      "await import('@joshuan/observability');",
      "await import('@joshuan/next-nest');",
      "await import('@joshuan/next-config');",
      "await import('@joshuan/auth-core');",
      "await import('@joshuan/auth-adapters');",
      "await import('@joshuan/auth-adapters/single-user');",
      "await import('@joshuan/testkit');",
      "await import('@joshuan/tooling/next');",
    ].join('\n'),
  );
  await writeFile(
    resolve(temporary, 'commonjs.cjs'),
    [
      "require('@joshuan/config');",
      "require('@joshuan/http');",
      "require('@joshuan/http/express');",
      "require('@joshuan/observability');",
      "require('@joshuan/next-nest');",
      "require('@joshuan/next-config');",
      "require('@joshuan/auth-core');",
      "require('@joshuan/auth-adapters');",
      "require('@joshuan/auth-adapters/single-user');",
      "require('@joshuan/testkit');",
    ].join('\n'),
  );
  await writeFile(
    resolve(temporary, 'classic-node.ts'),
    [
      "import { FilePasswordManager } from '@joshuan/auth-adapters/single-user';",
      'void FilePasswordManager;',
    ].join('\n'),
  );
  await writeFile(
    resolve(temporary, 'tsconfig.classic-node.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          ignoreDeprecations: '6.0',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'ES2022',
        },
        files: ['classic-node.ts'],
      },
      null,
      2,
    ),
  );
  execFileSync(process.execPath, ['esm.mjs'], { cwd: temporary, stdio: 'inherit' });
  execFileSync(process.execPath, ['commonjs.cjs'], { cwd: temporary, stdio: 'inherit' });
  execFileSync(
    process.execPath,
    [resolve(temporary, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.classic-node.json'],
    { cwd: temporary, stdio: 'inherit' },
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}

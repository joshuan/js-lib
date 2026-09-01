import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve(process.cwd(), 'dist/cjs');
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, 'package.json'), '{"type":"commonjs"}\n', 'utf8');

import { readFile, writeFile } from 'node:fs/promises';
import { dimensions } from './dist/esm/index.js';

const variables = Object.entries(dimensions).map(([key, value]) => {
  const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `  --jui-${name}: ${value}${key === 'motion' ? 'ms' : 'px'};`;
});
const styles = await readFile(new URL('./src/styles.css', import.meta.url), 'utf8');
await writeFile(
  new URL('./dist/styles.css', import.meta.url),
  `:root {\n${variables.join('\n')}\n}\n\n${styles}`,
);

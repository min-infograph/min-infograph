import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'release/out/assets');
const destination = resolve(root, 'apps/workbench/public/core/v0.2.1');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log('Copied static embed assets to apps/workbench/public/core/v0.2.1');

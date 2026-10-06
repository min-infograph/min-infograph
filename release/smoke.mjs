import { mkdtemp, readFile, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(await readFile(resolve(root, 'package.json')));
const registry = process.env.RELEASE_REGISTRY === 'true';
const specs = ['core', 'cli'].map(name => registry ? `@min-infograph/${name}@${version}` : resolve(root, `release/out/assets/min-infograph-${name}-${version}.tgz`));
const sample = {
  version: '0.1', title: 'Packed consumer', style: 'technical', shape: 'rounded', layout: { type: 'grid', columns: 2 },
  blocks: [
    { id: 'diagram', type: 'mermaid', title: 'Installed diagram', diagram: 'flowchart LR\nA[Input] --> B[Output]' },
    { id: 'image', type: 'image', image: { src: '/assets/nested/pixel.png', alt: 'Local fixture' } },
  ],
};
function run(command, args, cwd, expected = 0) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 180000 });
  console.log(result.stdout);
  if (result.error || result.status !== expected) throw new Error(`${command} ${args.join(' ')} failed (${result.status}): ${result.error ?? result.stderr}`);
  return result.stdout + result.stderr;
}
for (const manager of ['npm', 'pnpm']) {
  const consumer = await mkdtemp(resolve(tmpdir(), `min-infograph-${manager}-`));
  try {
    await writeFile(resolve(consumer, 'package.json'), '{"name":"packed-consumer","private":true,"type":"module","packageManager":"pnpm@12.6.0"}\n');
    run(manager, manager === 'npm' ? ['install', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org', ...specs] : ['add', '--ignore-workspace', '--registry=https://registry.npmjs.org', ...specs], consumer);
    const cli = resolve(consumer, 'node_modules/.bin/min-infograph');
    const help = run(cli, ['--help'], consumer);
    if (!help.includes('install-browser')) throw new Error('Missing browser install guidance');
    run(cli, ['install-browser'], consumer);
    await mkdir(resolve(consumer, 'assets/nested'), { recursive: true });
    await writeFile(resolve(consumer, 'assets/nested/pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', 'base64'));
    await writeFile(resolve(consumer, 'document.json'), JSON.stringify(sample));
    run(cli, ['validate', 'document.json'], consumer);
    await writeFile(resolve(consumer, 'invalid.json'), '{}');
    run(cli, ['validate', 'invalid.json'], consumer, 1);
    run(cli, ['render', 'document.json', 'render.png'], consumer);
    const png = await readFile(resolve(consumer, 'render.png'));
    if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.length < 10000 || png.readUInt32BE(16) < 500) throw new Error('Invalid or empty PNG');
    await rm(resolve(consumer, 'assets/nested/pixel.png'));
    const missing = run(cli, ['render', 'document.json', 'missing.png'], consumer, 1);
    if (!missing.includes('Failed to load image')) throw new Error('Missing asset must fail explicitly');
    await writeFile(resolve(consumer, 'assets/nested/pixel.png'), 'not a PNG');
    const corrupt = run(cli, ['render', 'document.json', 'corrupt.png'], consumer, 1);
    if (!corrupt.includes('Failed to load image')) throw new Error('Corrupt image must fail explicitly');
    await rm(resolve(consumer, 'assets/nested/pixel.png'));
    await writeFile(resolve(consumer, 'outside.png'), 'outside assets root');
    await symlink(resolve(consumer, 'outside.png'), resolve(consumer, 'assets/nested/pixel.png'));
    const escaped = run(cli, ['render', 'document.json', 'escaped.png'], consumer, 1);
    if (!escaped.includes('Failed to load image')) throw new Error('Escaped symlink must fail explicitly');
    await writeFile(resolve(consumer, 'smoke.mjs'), `import { render, validateIR, Infographic } from '@min-infograph/core';\nconst ir = validateIR(${JSON.stringify(sample)});\nif (ir.title !== 'Packed consumer' || typeof render !== 'function' || typeof Infographic !== 'function') throw new Error('Core API failure');\n`);
    run('node', ['smoke.mjs'], consumer);
    // TypeScript and host React types are tooling, linked only after runtime checks.
    await mkdir(resolve(consumer, 'node_modules/@types'), { recursive: true });
    for (const name of ['react', 'react-dom']) await symlink(resolve(root, `node_modules/@types/${name}`), resolve(consumer, `node_modules/@types/${name}`));
    await writeFile(resolve(consumer, 'consumer.tsx'), `import { Infographic, validateIR, render, type InfographicIR, type InfographicProps, type ThemeOverrides, type BlockRendererRegistry } from '@min-infograph/core';
import '@min-infograph/core/styles.css';
const ir: InfographicIR = validateIR({});
const theme: ThemeOverrides = { colors: { accent: '#123456' } };
const renderers: BlockRendererRegistry = { metric: ({ block }) => block.type === 'metric' ? <span>{block.value}</span> : null };
const props: InfographicProps = { ir, theme, headingLevel: 2, renderers };
const element = <Infographic {...props} />;
const handle: { unmount(): void } = render(document.createElement('div'), ir, { theme, headingLevel: 3, renderers });
// @ts-expect-error Heading levels are constrained
render(document.createElement('div'), ir, { headingLevel: 7 });
// @ts-expect-error Theme keys are checked
const invalid: ThemeOverrides = { invented: true };
handle.unmount();
`);
    run('node', [resolve(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--jsx', 'react-jsx', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', 'consumer.tsx'], consumer);
    console.log(`${manager}: ${registry ? 'registry' : 'tarball'} help, validation, PNG/diagram/local image, missing asset failure, public API and declarations passed`);
  } finally { await rm(consumer, { recursive: true, force: true }); }
}

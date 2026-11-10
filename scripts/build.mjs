import { build } from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const fromRoot = path => new URL(path, root);
const { name } = JSON.parse(await readFile(fromRoot('package.json'), 'utf8'));
const bundle = await build({
  stdin: { contents: await readFile(fromRoot('src/client.js'), 'utf8'), sourcefile: 'src/client.js' },
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  write: false,
  metafile: true,
});
if (Object.values(bundle.metafile.outputs).some(output => output.imports.length > 0)) {
  throw new Error('The browser bundle must be self-contained');
}

await mkdir(fromRoot('lib/'), { recursive: true });
await copyFile(fromRoot('src/index.js'), fromRoot('lib/index.js'));
await writeFile(fromRoot('lib/client.js'), `window.__ModuleLoader__.load({
  id: ${JSON.stringify(name)},
  factory: () => {
    const module = { exports: {} };
${bundle.outputFiles[0].text}
    return module.exports;
  },
});\n`);

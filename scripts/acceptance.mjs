#!/usr/bin/env node
// MVP acceptance script — see docs/MVP-PLAN.md.
//
// Runs the full edit-emit-verify loop standalone (no vitest):
//   1) Ingest the fixture project.
//   2) Apply the three canonical edits called out in the spec
//      (--primary, --radius, button.size.sm padding).
//   3) Run the codegen pipeline.
//   4) Diff emitted output against the on-disk fixture.
//   5) Assert: the diff contains ONLY the three intended changes — no
//      formatting noise — and the rewritten button source still parses
//      through our own ingest.
//
// Exits non-zero on any failure so CI can gate on this.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/shadcn-app');

// Use tsx to load the TS source modules at runtime.
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

// Dynamic imports through tsx — invoked via `node --import tsx scripts/acceptance.mjs`
// or `pnpm exec tsx scripts/acceptance.mjs`.
const ingestUrl = pathToFileURL(path.join(projectRoot, 'src/ingest/index.ts')).href;
const codegenUrl = pathToFileURL(path.join(projectRoot, 'src/codegen/index.ts')).href;
const { loadProject, parseComponentSource } = await import(ingestUrl);
const { emitProject } = await import(codegenUrl);

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`  ✗ ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);
const section = (label) => console.log(`\n${label}`);

section('1) Ingest fixture');
const doc = loadProject({ rootDir: FIXTURE_ROOT });
ok(`loaded ${doc.components.length} components`);

const originals = {
  'app/globals.css': fs.readFileSync(path.join(FIXTURE_ROOT, 'app/globals.css'), 'utf8'),
  'components.json': fs.readFileSync(path.join(FIXTURE_ROOT, 'components.json'), 'utf8'),
};
for (const c of doc.components) {
  originals[c.source.path] = fs.readFileSync(path.join(FIXTURE_ROOT, c.source.path), 'utf8');
}

section('2) Apply three canonical edits');
const edited = {
  ...doc,
  tokens: {
    ...doc.tokens,
    radius: { base: '0.5rem' },
    colors: {
      ...doc.tokens.colors,
      light: {
        ...doc.tokens.colors.light,
        primary: { kind: 'literal', space: 'oklch', value: 'oklch(0.55 0.18 264)' },
      },
    },
  },
  overrides: [
    {
      componentId: 'button',
      variants: {
        size: {
          sm: { set: { 'padding-inline': '1rem' }, removeUtilities: ['px-3'] },
        },
      },
    },
  ],
};
ok('mutated --primary, --radius, and button.size.sm padding');

section('3) Emit + filter to actually-changed files');
const emitted = emitProject({ document: edited, originals }).filter(
  (f) => !f.isNew && f.original !== f.emitted,
);
const changedPaths = emitted.map((f) => f.path).sort();
const expectedPaths = ['app/globals.css', 'components/ui/button.tsx'];
if (JSON.stringify(changedPaths) === JSON.stringify(expectedPaths)) {
  ok(`exactly the two intended files changed: ${changedPaths.join(', ')}`);
} else {
  fail(`expected only ${expectedPaths.join(' + ')}, got ${changedPaths.join(', ')}`);
}

section('4) Diff carries only the intended lines');
const css = emitted.find((f) => f.path === 'app/globals.css');
if (css) {
  const cssDiff = lineDiff(css.original ?? '', css.emitted);
  if (cssDiff.added.length === 2 && cssDiff.removed.length === 2) {
    ok(`globals.css changed exactly 2 lines (+2/-2)`);
  } else {
    fail(`globals.css diff is noisy: +${cssDiff.added.length}/-${cssDiff.removed.length}`);
  }
  const cssLines = [...cssDiff.added, ...cssDiff.removed];
  if (cssLines.every((l) => l.includes('--primary:') || l.includes('--radius:'))) {
    ok('globals.css diff touches only --primary and --radius');
  } else {
    fail(`globals.css diff includes lines outside --primary/--radius:\n${cssLines.join('\n')}`);
  }
}

const button = emitted.find((f) => f.path === 'components/ui/button.tsx');
if (button) {
  const buttonDiff = lineDiff(button.original ?? '', button.emitted);
  if (buttonDiff.added.length === 1 && buttonDiff.removed.length === 1) {
    ok(`button.tsx changed exactly 1 line (+1/-1)`);
  } else {
    fail(`button.tsx diff is noisy: +${buttonDiff.added.length}/-${buttonDiff.removed.length}`);
  }
  if (buttonDiff.added[0]?.includes('px-4') && buttonDiff.removed[0]?.includes('px-3')) {
    ok('button.tsx swap is px-3 → px-4 on size.sm');
  } else {
    fail(
      `button.tsx swap looks wrong:\n  - ${buttonDiff.removed[0]}\n  + ${buttonDiff.added[0]}`,
    );
  }
}

section('5) Rewritten button.tsx still parses cleanly (build/lint surrogate)');
if (button) {
  const reparsed = parseComponentSource({
    id: 'button',
    registryName: 'button',
    filePath: 'components/ui/button.tsx',
    sourceText: button.emitted,
  });
  if (reparsed.variants.length === 0) {
    fail('cva variants vanished after rewrite');
  } else if (!reparsed.variants.find((v) => v.name === 'size')?.options.includes('sm')) {
    fail('size.sm option lost during rewrite');
  } else {
    ok(`re-ingest sees ${reparsed.variants.length} variant axes intact`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`MVP acceptance: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('MVP acceptance: pass');

function lineDiff(a, b) {
  const aLines = new Set(a.split('\n'));
  const bLines = new Set(b.split('\n'));
  const added = [];
  const removed = [];
  for (const line of bLines) if (!aLines.has(line)) added.push(line);
  for (const line of aLines) if (!bLines.has(line)) removed.push(line);
  return { added, removed };
}

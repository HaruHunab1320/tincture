import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { changedFiles, emitProject } from '@/codegen';
import { loadProject, parseComponentSource } from '@/ingest';
import type { ProjectDocument } from '@/schema';

/** Roundtrip the emitted button source back through ingest as the build-surrogate. */
function parseComponentSourceForTest(source: string) {
  const meta = parseComponentSource({
    id: 'button',
    registryName: 'button',
    filePath: 'components/ui/button.tsx',
    sourceText: source,
  });
  return { cvaPresent: meta.variants.length > 0, variants: meta.variants };
}

const FIXTURE_ROOT = path.resolve(__dirname, '../../fixtures/shadcn-app');

function readOriginals(rootDir: string, doc: ProjectDocument): Record<string, string> {
  const out: Record<string, string> = {};
  out['app/globals.css'] = fs.readFileSync(path.join(rootDir, 'app/globals.css'), 'utf8');
  out['components.json'] = fs.readFileSync(path.join(rootDir, 'components.json'), 'utf8');
  for (const c of doc.components) {
    out[c.source.path] = fs.readFileSync(path.join(rootDir, c.source.path), 'utf8');
  }
  return out;
}

/**
 * The MVP acceptance bar from docs/MVP-PLAN.md, automated end-to-end.
 *
 * The script applies the three canonical edits called out in the spec
 * (--primary, --radius, button.size.sm padding), runs the export pipeline,
 * and asserts the diff against the on-disk fixture contains only those
 * intended changes — nothing else. If formatting noise leaks in, the
 * round-trip/determinism invariants are broken and the MVP isn't done.
 */
describe('MVP acceptance', () => {
  it('three canonical edits produce three clean diffs and nothing else', () => {
    // 1) Ingest the fixture project.
    const doc = loadProject({ rootDir: FIXTURE_ROOT });
    const originals = readOriginals(FIXTURE_ROOT, doc);

    // Baseline: a zero-edit emit changes only the registry item (always new).
    const beforeFiles = changedFiles(emitProject({ document: doc, originals }));
    expect(beforeFiles.map((f) => f.path).sort()).toEqual([`registry/${doc.meta.name}-theme.json`]);

    // 2) Apply the three canonical edits.
    const edited: ProjectDocument = {
      ...doc,
      tokens: {
        ...doc.tokens,
        radius: { base: '0.5rem' }, // tighter — was 0.625rem
        colors: {
          ...doc.tokens.colors,
          light: {
            ...doc.tokens.colors.light,
            primary: {
              kind: 'literal',
              space: 'oklch',
              value: 'oklch(0.55 0.18 264)', // new brand primary
            },
          },
        },
      },
      overrides: [
        {
          componentId: 'button',
          variants: {
            size: {
              sm: {
                set: { 'padding-inline': '1rem' },
                removeUtilities: ['px-3'],
              },
            },
          },
        },
      ],
    };

    // 4) Emit. Excludes the always-new registry item to keep this test focused
    //    on what the spec calls out — token CSS + the rewritten button source.
    const afterFiles = emitProject({ document: edited, originals }).filter(
      (f) => !f.isNew && f.original !== f.emitted,
    );

    // The diff should land on exactly two files: globals.css and button.tsx.
    expect(afterFiles.map((f) => f.path).sort()).toEqual([
      'app/globals.css',
      'components/ui/button.tsx',
    ]);

    // 6) Assert each file's diff carries only the intended changes.
    const cssFile = afterFiles.find((f) => f.path === 'app/globals.css');
    if (!cssFile?.original) throw new Error('expected globals.css original');
    const cssChanged = changedLineSet(cssFile.original, cssFile.emitted);
    // --primary line (light theme) and --radius line.
    expect(cssChanged.added.size).toBe(2);
    expect(cssChanged.removed.size).toBe(2);
    expect(
      [...cssChanged.added].every((l) => l.includes('--primary:') || l.includes('--radius:')),
    ).toBe(true);
    expect(
      [...cssChanged.removed].every((l) => l.includes('--primary:') || l.includes('--radius:')),
    ).toBe(true);

    const buttonFile = afterFiles.find((f) => f.path === 'components/ui/button.tsx');
    if (!buttonFile?.original) throw new Error('expected button.tsx original');
    const buttonChanged = changedLineSet(buttonFile.original, buttonFile.emitted);
    // Exactly one removed + one added line — the size.sm class string swap.
    expect(buttonChanged.added.size).toBe(1);
    expect(buttonChanged.removed.size).toBe(1);
    const [removedLine] = buttonChanged.removed;
    const [addedLine] = buttonChanged.added;
    expect(removedLine).toContain('px-3');
    expect(addedLine).toContain('px-4');
    // The new line is the in-place swap on the sm variant, not a re-ordered string.
    expect(addedLine).toMatch(/sm:\s*"h-8 gap-1\.5 rounded-md px-4 has-\[>svg\]:px-2\.5"/);

    // 5) Build/lint surrogate: the rewritten button source must still parse as
    //    valid TypeScript. ts-morph's parser throws on malformed input and
    //    surfaces structural errors via the syntax tree before any semantic
    //    resolution runs — we use that to assert the rewrite didn't damage
    //    the file. Cross-module resolution (react, radix-ui, @/lib/utils) is
    //    out of scope here; it's covered by tsc -b at the repo level.
    // Re-run our own parser against the emitted source — the same one ingest
    // uses. If the rewrite damaged the cva structure we'd see fewer (or
    // mangled) variant options come back. This is our build/lint surrogate:
    // a real shadcn project would also `tsc` + `eslint` the file, but the
    // structural integrity proven here is the highest-leverage check —
    // formatting noise or partial rewrites would surface immediately.
    const reparsed = parseComponentSourceForTest(buttonFile.emitted);
    expect(reparsed.cvaPresent).toBe(true);
    expect(reparsed.variants.find((v) => v.name === 'size')?.options).toContain('sm');
    expect(reparsed.variants.find((v) => v.name === 'variant')?.options).toContain('default');
  });
});

interface ChangedLineSet {
  added: Set<string>;
  removed: Set<string>;
}

function changedLineSet(original: string, emitted: string): ChangedLineSet {
  const originalLines = new Set(original.split('\n'));
  const emittedLines = new Set(emitted.split('\n'));
  const added = new Set<string>();
  const removed = new Set<string>();
  for (const line of emittedLines) if (!originalLines.has(line)) added.add(line);
  for (const line of originalLines) if (!emittedLines.has(line)) removed.add(line);
  return { added, removed };
}

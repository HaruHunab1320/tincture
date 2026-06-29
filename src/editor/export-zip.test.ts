import { describe, expect, it } from 'vitest';
import type { EmittedFile } from '@/codegen';
import { selectFilesForShape } from './export-zip';

const FILES: EmittedFile[] = [
  { path: 'app/globals.css', emitted: '/* css */', original: '', isNew: false },
  { path: 'components.json', emitted: '{}', original: '', isNew: false },
  { path: 'registry/shadcn-app-theme.json', emitted: '{}', isNew: true },
  {
    path: 'components/ui/button.tsx',
    emitted: 'export const Button = () => null',
    original: '',
    isNew: false,
  },
];

describe('selectFilesForShape', () => {
  it('theme-files keeps globals.css + components.json', () => {
    const result = selectFilesForShape(FILES, 'theme-files')
      .map((f) => f.path)
      .sort();
    expect(result).toEqual(['app/globals.css', 'components.json']);
  });

  it('registry-item keeps only the registry/*.json', () => {
    const result = selectFilesForShape(FILES, 'registry-item').map((f) => f.path);
    expect(result).toEqual(['registry/shadcn-app-theme.json']);
  });

  it('component-overrides keeps only components/ui/*', () => {
    const result = selectFilesForShape(FILES, 'component-overrides').map((f) => f.path);
    expect(result).toEqual(['components/ui/button.tsx']);
  });

  it('everything passes through the full set', () => {
    expect(selectFilesForShape(FILES, 'everything')).toEqual(FILES);
  });
});

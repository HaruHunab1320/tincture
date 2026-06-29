import JSZip from 'jszip';
import type { EmittedFile } from '@/codegen';

export type ExportShape = 'theme-files' | 'registry-item' | 'component-overrides' | 'everything';

export interface ExportShapeDescriptor {
  id: ExportShape;
  label: string;
  description: string;
}

export const EXPORT_SHAPES: ExportShapeDescriptor[] = [
  {
    id: 'theme-files',
    label: 'Theme files',
    description: 'globals.css + components.json — drop into a shadcn project root',
  },
  {
    id: 'registry-item',
    label: 'Registry theme item',
    description: 'a single .json — share via `npx shadcn add @brand/theme`',
  },
  {
    id: 'component-overrides',
    label: 'Component overrides',
    description: 'modified components/ui/*.tsx for variant edits',
  },
  {
    id: 'everything',
    label: 'Everything',
    description: 'all of the above bundled together',
  },
];

/**
 * Narrow an emit result to just the files relevant to the chosen shape. The
 * default `everything` keeps the original set; the targeted shapes match
 * paths to the conventional shadcn layout.
 */
export function selectFilesForShape(files: EmittedFile[], shape: ExportShape): EmittedFile[] {
  if (shape === 'everything') return files;
  return files.filter((file) => {
    if (shape === 'theme-files') {
      return file.path === 'components.json' || file.path.endsWith('globals.css');
    }
    if (shape === 'registry-item') {
      return file.path.startsWith('registry/');
    }
    if (shape === 'component-overrides') {
      return file.path.startsWith('components/ui/');
    }
    return false;
  });
}

/**
 * Build a zip from the emitted file-set and trigger a browser download.
 * Only files that differ from their original (or are new) are included —
 * dropping zero-change emit into a real project should produce no work.
 */
export async function downloadProjectZip(files: EmittedFile[], archiveName: string): Promise<void> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.emitted);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, `${archiveName}.zip`);
}

/**
 * Single-file shortcut — used when the chosen shape narrows to exactly one
 * file (e.g. the registry-item-only export), saving the user a zip-unwrap step.
 */
export function downloadSingleFile(file: EmittedFile): void {
  const blob = new Blob([file.emitted], { type: 'text/plain' });
  const filename = file.path.split('/').pop() ?? 'export.txt';
  triggerBlobDownload(blob, filename);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

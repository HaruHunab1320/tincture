import { useEffect, useRef, useState } from 'react';
import type { EmittedFile } from '@/codegen';
import {
  downloadProjectZip,
  downloadSingleFile,
  EXPORT_SHAPES,
  type ExportShape,
  selectFilesForShape,
} from './export-zip';

interface ExportMenuProps {
  files: EmittedFile[];
  archiveName: string;
}

/**
 * Split-action Export control: the primary button exports the most-recently
 * chosen shape (defaults to "everything"); the chevron opens a small popover
 * listing every shape. Each row shows the file count it would produce so
 * users can sanity-check before downloading.
 */
export function ExportMenu({ files, archiveName }: ExportMenuProps) {
  const [shape, setShape] = useState<ExportShape>('everything');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handle);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const runExport = async (chosen: ExportShape) => {
    const selected = selectFilesForShape(files, chosen);
    if (selected.length === 0) return;
    if (selected.length === 1) {
      downloadSingleFile(selected[0]);
    } else {
      await downloadProjectZip(selected, archiveName);
    }
    setOpen(false);
  };

  const currentLabel = EXPORT_SHAPES.find((s) => s.id === shape)?.label ?? 'Export';

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => runExport(shape)}
        className="inline-flex items-center gap-2 rounded-l-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white"
      >
        Export <span className="text-neutral-500">·</span> {currentLabel}
      </button>
      <button
        type="button"
        aria-label="Choose export shape"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center rounded-r-md border-l border-neutral-300 bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 hover:bg-white"
      >
        ▾
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1 w-80 rounded-md border border-neutral-800 bg-neutral-950 p-1 text-neutral-100 shadow-lg">
          {EXPORT_SHAPES.map((s) => {
            const count = selectFilesForShape(files, s.id).length;
            const disabled = count === 0;
            const selected = s.id === shape;
            return (
              <button
                key={s.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setShape(s.id);
                  runExport(s.id);
                }}
                className={`flex w-full flex-col items-start gap-0.5 rounded px-2 py-2 text-left text-xs transition-colors disabled:opacity-40 ${
                  selected ? 'bg-neutral-900' : 'hover:bg-neutral-900'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium text-neutral-100">{s.label}</span>
                  <span className="font-mono text-[10px] text-neutral-500">
                    {count} {count === 1 ? 'file' : 'files'}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500">{s.description}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

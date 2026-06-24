import { fixtureProject } from 'virtual:tincture-fixture';
import { useEffect } from 'react';
import { PropertyPanel } from '@/editor';
import { Canvas } from '@/renderer';
import { useProjectStore } from '@/store/project-store';

export default function App() {
  const document = useProjectStore((s) => s.document);
  const load = useProjectStore((s) => s.load);

  useEffect(() => {
    load(fixtureProject);
    if (import.meta.env.DEV) {
      (window as unknown as { __TINCTURE_STORE__: typeof useProjectStore }).__TINCTURE_STORE__ =
        useProjectStore;
    }
  }, [load]);

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="shrink-0 border-b border-neutral-800 px-6 py-4">
        <h1 className="text-lg font-medium tracking-tight">Tincture</h1>
        <p className="text-sm text-neutral-400">
          {document
            ? `${document.meta.name} · ${document.meta.baseColor} · ${document.components.length} components`
            : 'Loading fixture…'}
        </p>
      </header>
      {document ? (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <Canvas document={document} />
          </main>
          <div className="flex h-full shrink-0 border-l border-neutral-800">
            <PropertyPanel document={document} />
          </div>
        </div>
      ) : (
        <main className="p-6 text-sm text-neutral-500">Loading…</main>
      )}
    </div>
  );
}

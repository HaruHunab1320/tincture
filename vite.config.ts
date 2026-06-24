import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const FIXTURE_VIRTUAL_ID = 'virtual:tincture-fixture';
const RESOLVED_FIXTURE_ID = `\0${FIXTURE_VIRTUAL_ID}`;
const FIXTURE_ROOT = path.resolve(__dirname, 'fixtures/shadcn-app');

/**
 * Surface the ingested fixture ProjectDocument to the browser. The plugin
 * calls our own ingest pipeline at dev time and re-runs whenever any file
 * under `fixtures/shadcn-app/` changes, so the editor always reflects the
 * canonical fixture without bundling a stale snapshot.
 */
function fixtureProjectPlugin(): Plugin {
  return {
    name: 'tincture:fixture-project',
    resolveId(id) {
      if (id === FIXTURE_VIRTUAL_ID) return RESOLVED_FIXTURE_ID;
      return null;
    },
    async load(id) {
      if (id !== RESOLVED_FIXTURE_ID) return null;
      const { loadProject } = await import('./src/ingest/load-project');
      const doc = loadProject({ rootDir: FIXTURE_ROOT, name: 'shadcn-app' });
      return `export const fixtureProject = ${JSON.stringify(doc)};`;
    },
    configureServer(server) {
      server.watcher.add(FIXTURE_ROOT);
      server.watcher.on('all', (_event, filePath) => {
        if (filePath.startsWith(FIXTURE_ROOT)) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_FIXTURE_ID);
          if (mod) server.reloadModule(mod);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), fixtureProjectPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

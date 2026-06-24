// Re-export the fixture's cn helper so fixture components compile under
// our Vite alias `@/lib/utils` and live-render in the editor preview without
// duplicating the helper.
export { cn } from '../../fixtures/shadcn-app/lib/utils';

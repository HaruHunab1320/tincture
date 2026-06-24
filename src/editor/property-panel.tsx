import type { ProjectDocument } from '@/schema';
import { ColorPanel } from './panels/color-panel';
import { ComponentPanel } from './panels/component-panel';
import { RadiusPanel } from './panels/radius-panel';
import { ShadowPanel } from './panels/shadow-panel';
import { TypographyPanel } from './panels/typography-panel';

interface PropertyPanelProps {
  document: ProjectDocument;
}

export function PropertyPanel({ document }: PropertyPanelProps) {
  return (
    <aside className="flex w-[340px] shrink-0 flex-col gap-3 overflow-y-auto p-4 text-neutral-100">
      <ColorPanel document={document} />
      <RadiusPanel document={document} />
      <TypographyPanel document={document} />
      <ShadowPanel document={document} />
      <ComponentPanel document={document} />
    </aside>
  );
}

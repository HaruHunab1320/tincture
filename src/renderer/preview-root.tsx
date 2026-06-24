import type { CSSProperties, ReactNode } from 'react';
import type { ColorValue, ProjectDocument } from '@/schema';
import { SEMANTIC_COLOR_TOKENS } from '@/schema';

export type PreviewTheme = 'light' | 'dark';

function resolveColorValue(value: ColorValue): string {
  if (value.kind === 'literal') return value.value;
  const basePercent = Math.round((1 - value.mix.amount) * 100);
  return `color-mix(in ${value.mix.space}, var(--${value.from}) ${basePercent}%, ${value.mix.toward})`;
}

function tokensToCssVars(doc: ProjectDocument, theme: PreviewTheme): CSSProperties {
  const themeColors = doc.tokens.colors[theme];
  const style: Record<string, string> = { '--radius': doc.tokens.radius.base };
  for (const token of SEMANTIC_COLOR_TOKENS) {
    style[`--${token}`] = resolveColorValue(themeColors[token]);
  }
  return style as CSSProperties;
}

export interface PreviewRootProps {
  document: ProjectDocument;
  theme: PreviewTheme;
  children: ReactNode;
  className?: string;
}

/**
 * Live-preview root: applies the current TokenState as inline CSS custom
 * properties on a wrapper div so child components reflect token edits
 * without any recompile. Toggles the `.dark` class when theme === 'dark' so
 * shadcn's `@custom-variant dark (&:is(.dark *))` utilities resolve too.
 *
 * The bytes the preview applies are the same ones `emit-theme-css` writes
 * for each token, so what you see here is what you'll export.
 */
export function PreviewRoot({ document, theme, children, className }: PreviewRootProps) {
  const vars = tokensToCssVars(document, theme);
  const composed = ['tincture-preview', theme === 'dark' ? 'dark' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div data-theme={theme} style={vars} className={`${composed} bg-background text-foreground`}>
      {children}
    </div>
  );
}

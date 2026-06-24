import { useState } from 'react';
import type { ProjectDocument } from '@/schema';
import { Badge } from '../../fixtures/shadcn-app/components/ui/badge';
import { Button } from '../../fixtures/shadcn-app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../fixtures/shadcn-app/components/ui/card';
import { Input } from '../../fixtures/shadcn-app/components/ui/input';
import { PreviewRoot, type PreviewTheme } from './preview-root';

interface ThemeToggleProps {
  theme: PreviewTheme;
  onChange: (theme: PreviewTheme) => void;
}

function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-neutral-800 p-1 text-xs">
      {(['light', 'dark'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`rounded px-2 py-1 transition-colors ${
            theme === t
              ? 'bg-neutral-100 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-100'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

interface CanvasProps {
  document: ProjectDocument;
}

/**
 * Preview canvas: hosts the PreviewRoot, lays out the four fixture components
 * for visual inspection, and exposes a light/dark toggle. The viewport is
 * `resize: horizontal` (a CSS-native handle on the right edge) so users can
 * see component behavior at narrower widths — the entire point of a
 * component editor.
 */
export function Canvas({ document }: CanvasProps) {
  const [theme, setTheme] = useState<PreviewTheme>('light');

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-200">Preview</h2>
        <ThemeToggle theme={theme} onChange={setTheme} />
      </div>

      <div
        className="overflow-auto resize-x min-w-[320px] max-w-full rounded-lg border border-neutral-800"
        style={{ resize: 'horizontal', width: '100%' }}
      >
        <PreviewRoot document={document} theme={theme} className="min-h-[480px] p-8">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Buttons</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button disabled>Disabled</Button>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Badges</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Input</p>
              <Input placeholder="you@example.com" className="max-w-sm" />
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Card</p>
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Manage your account preferences and visibility.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Cards group related content and stay aligned with theme tokens.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
        </PreviewRoot>
      </div>
    </section>
  );
}

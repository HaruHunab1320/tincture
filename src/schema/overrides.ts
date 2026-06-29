import { z } from 'zod';
import { ColorValueSchema } from './tokens';

/**
 * A class-string delta for one cva variant option. Three edit shapes:
 *
 *  - `set` + `removeUtilities`: structured property->utility edits (e.g.
 *    "padding-inline: 1rem"), used by the M3 cva-rewrite path for surgical
 *    swaps that preserve the surrounding class string.
 *  - `addUtilities`: append raw Tailwind utility tokens. The natural fit for
 *    shadcn-style state edits like adding `hover:bg-primary/85`.
 *  - `replaceWith`: full string replacement. Used when the override editor
 *    presents a free-form text input — we don't try to diff utility-by-utility,
 *    we just take what the user typed.
 *
 * When `replaceWith` is present it takes precedence over the structured fields.
 */
export const ClassDeltaSchema = z.object({
  set: z.record(z.string(), z.string()).optional(),
  removeUtilities: z.array(z.string()).optional(),
  addUtilities: z.array(z.string()).optional(),
  replaceWith: z.string().optional(),
});
export type ClassDelta = z.infer<typeof ClassDeltaSchema>;

const ScopedVarValueSchema = z.union([ColorValueSchema, z.string()]);

export const ComponentOverrideSchema = z.object({
  componentId: z.string().min(1),
  scopedVars: z.record(z.string(), ScopedVarValueSchema).optional(),
  variants: z.record(z.string(), z.record(z.string(), ClassDeltaSchema)).optional(),
});
export type ComponentOverride = z.infer<typeof ComponentOverrideSchema>;

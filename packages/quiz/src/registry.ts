import { TEMPLATES as T1, type Template } from './templates.ts';
import { MORE } from './templates-more.ts';
import { HOOK } from './templates-hook.ts';
/** Every round template the quiz builder knows (docs/brands/quiz-ar/templates.md). */
export const TEMPLATES: Record<string, Template> = { ...T1, ...MORE, ...HOOK };

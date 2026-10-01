export { paletteFor, type Palette, type Accent } from './palette.js';
export const dimensions = {
  sidebar: 240,
  sidebarCollapsed: 64,
  navigationDrawer: 280,
  formDialog: 640,
  gutter: 24,
  gutterTablet: 16,
  gutterPhone: 12,
  pageTitle: 24,
  pageTitlePhone: 20,
  control: 40,
  controlSmall: 32,
  touchTarget: 44,
  motion: 140,
} as const;

export const FONT_SANS =
  'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
export const FONT_MONO = 'var(--font-mono, ui-monospace, monospace)';

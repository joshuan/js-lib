# @joshuan/design-system

Shared UI foundations for Legere and Rent Manager, built for Ant Design 6 and React 19.
The source contract and extraction audit are in `docs/design-system.md` at the repository root.

```tsx
import { createAppTheme } from '@joshuan/design-system/antd';
import { PageHeader, useSystemAppearance } from '@joshuan/design-system/react';
import '@joshuan/design-system/styles.css';

// Inside your provider; locale, account preference and hydration policy remain local.
const { dark, reducedMotion } = useSystemAppearance();
const theme = createAppTheme({ dark, reducedMotion, accent: 'green' });
// Pass theme to Ant Design ConfigProvider. Render its App below it for CSS variables.
// Use accent: 'blue' for Rent Manager.
```

`PageHeader` receives title, description, back, actions and meta as React nodes. It renders one h1.
Pass a host Link as `back`; the package never owns routing or translations. Import the stylesheet
once in the root layout. Self-host IBM Plex Sans and Mono as `--font-sans` and `--font-mono`.
Root exports contain palettes, font declarations and dimensions; they have no React side effects.
`/react` preserves its client boundary. Components and Ant Design are peers, never bundled copies.

Build with `npm run build --workspace @joshuan/design-system`. The build generates CSS dimensions
from the same source as TypeScript. Pack with `npm pack --workspace @joshuan/design-system`.
Do not copy styles or themes into applications. Product-specific viewer and apartment layouts stay
in the applications. Changes to colours, headings or dimensions require both consumer visual suites.

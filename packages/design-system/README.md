# @joshuan/design-system

Shared UI foundations for Legere and Rent Manager, built for Ant Design 6 and React 19.
The published package includes [the migration guide](./MIGRATION.md). The source contract and
extraction audit are in `docs/design-system.md` at the repository root.

```tsx
import { createAppTheme } from '@joshuan/design-system/antd';
import { PageHeader, useSystemAppearance } from '@joshuan/design-system/react';
import '@joshuan/design-system/styles.css';

// Inside your provider; locale, account preference and hydration policy remain local.
const { dark, reducedMotion } = useSystemAppearance();
const theme = createAppTheme({ dark, reducedMotion, accent: 'amber' });
// Pass theme to Ant Design ConfigProvider. Render its App below it for CSS variables.
// Use accent: 'blue' for Rent Manager, or 'green' for a teal brand.
```

`PageHeader` receives title, description, back, actions and meta as React nodes. It renders one h1.
Pass a host Link as `back`; the package never owns routing or translations. Import the stylesheet
once in the root layout. It supplies the pinned, self-hosted IBM Plex Sans and Mono binaries and
`--font-sans` / `--font-mono`; no Google font loader or network request is needed during build.
The included `dist/fonts/LICENSE.txt` applies to the font files, and `provenance.json` records their hashes.
Root exports contain palettes, font declarations and dimensions; they have no React side effects.
`/react` preserves its client boundary. Components and Ant Design are peers, never bundled copies.

`NavigationFrame` supplies the same 240/64 px collapsible sidebar and 280 px phone drawer to
both products. It starts compact between 768 and 1023 px, uses the drawer below 768 px, and keeps
an explicit desktop collapse choice during client navigation. Supply `pathname`, localized
`labels`, product `navigation(collapsed)` content and a `brand` home link containing
`<AppBrand name={name} mark={mark} />`. Links, route changes, Escape and leaving the phone
breakpoint close the drawer. Routes, account controls and menu expansion remain host-owned.
The same AppBrand belongs in public authentication headers, always inside a home link.

Build with `npm run build --workspace @joshuan/design-system`. The build generates CSS dimensions
from the same source as TypeScript. Pack with `npm pack --workspace @joshuan/design-system`.
Do not copy styles or themes into applications. Product-specific viewer and apartment layouts stay
in the applications. Changes to colours, headings or dimensions require contrast checks for every supported accent and
visual checks in each consumer when it upgrades. Applications keep independent release schedules.

## Colors and states

`createAppTheme({ dark, accent, reducedMotion })` owns the complete theme. Choose `amber`, `blue`
or `green`; every accent has coordinated light/dark action, text, selection and focus colors.
Do not override just `colorPrimary`: a bright action fill is intentionally different from the
color used for small links and form boundaries. `paletteFor(dark, accent)` exposes the same roles
for custom visualizations or exported icons; use Ant Design tokens inside React components.

| Purpose                      | Ant Design token / CSS variable                        | Palette field             |
| ---------------------------- | ------------------------------------------------------ | ------------------------- |
| Main action / selected route | `colorPrimary` / `--ant-color-primary`                 | `primary`                 |
| Text on a brand fill         | `colorTextLightSolid` / `--ant-color-text-light-solid` | `onPrimary`               |
| Links, focus, active labels  | `colorPrimaryText` / `--ant-color-primary-text`        | `brandText`               |
| Selected rows and options    | `colorPrimaryBg` / `--ant-color-primary-bg`            | `selected`                |
| Main / secondary text        | `colorText` / `colorTextSecondary`                     | `text` / `textSecondary`  |
| Input boundaries / dividers  | `colorBorder` / `colorBorderSecondary`                 | `borderStrong` / `border` |

The shared CSS supplies visible keyboard focus, selected-label weight, text selection and a
contrasting checked switch handle. Selected menu metadata inherits its foreground. Forms, tables,
tags and overlays share the palette. Information is blue, success green, warnings orange and errors
red; labels and icons accompany status color. Named tags `green`, `red`, `blue`, `orange`, `gold`
and `purple` have explicitly contrasted filled/outlined/solid states.

Amber uses `#FFBD3E` with `#332100` text. In the light theme, small amber links use `#805000`;
in the dark theme they use `#FFD16E`. A white label on the amber action fill is not readable enough.
This follows the separate brand-fill, brand-text and contrasting-text roles described in
[Gravity UI branding](https://gravity-ui.com/design/branding/branding).

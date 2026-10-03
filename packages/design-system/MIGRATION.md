# Upgrade to 0.3 — contrast and product brands

This release replaces the previous muted theme. It does not keep a legacy-theme switch or a
second configuration layer. It changes the appearance of all three accents; routes, layout,
fonts, component behavior and peer dependency requirements are unchanged.

## Install and configure

```sh
npm install --save-exact @joshuan/design-system@0.3.0
```

Import `@joshuan/design-system/styles.css` once in the root layout, before application styles.
Pass the factory result directly to Ant Design's `ConfigProvider` and render `App` beneath it:

```tsx
const appearance = createAppTheme({
  dark,
  reducedMotion,
  accent: 'amber', // Legere. Use 'blue' for Rent Manager or 'green' for a teal identity.
});

<ConfigProvider theme={appearance}>
  <App>{children}</App>
</ConfigProvider>;
```

Keep system appearance, locale and account preference resolution in the host provider. Continue
using `useSystemAppearance` for OS theme and reduced motion. Keep the existing hydration policy.
Other services can upgrade independently and retain their own accent choice.

## Remove duplicated styling

Delete application-owned palette tables, component-color patches and brand overrides around
`createAppTheme`. Remove duplicate focus, `::selection`, selected-menu/tab/segmented weight and
checked-switch-handle rules now provided by the package. Remove hardcoded white text on primary
buttons, selected routes and brand marks. Leave domain layouts, document-paper colors and logo
geometry in the application; update favicon/exported logo colors to match the selected brand.

For custom components:

- Use `colorPrimary` for a solid brand fill and `colorTextLightSolid` for its label.
- Use `colorPrimaryText` or `colorLink` for readable brand text; do not use the bright fill as text.
- Use `colorPrimaryBg` for selected surfaces and `colorPrimaryText` for their labels.
- Use `colorBorder` for form boundaries and `colorBorderSecondary` for structural dividers.
- Use semantic status tokens instead of interpreting the brand as a warning or success.
- Let selected-menu metadata inherit its foreground; do not retain a fixed secondary gray.

`Palette.accent` was ambiguous and is removed. Replace it with `primary` for brand fills or
`warning` for warnings. Existing `page`, `surface`, `surfaceRaised`, `border`, `borderStrong`,
`text`, `textSecondary`, primary-state and semantic fields remain. New fields describe brand text,
on-brand text, selection states, muted text, fills and interaction outlines.

## Verify the consumer

Run its typecheck, lint, component tests and production build. Review light/dark screenshots at
320, 390, 768, 1024 and 1440 px, including both supported languages, before accepting expected
baseline changes. Rerun screenshot comparisons without the update flag. Check a primary action
at rest/hover/press, keyboard focus, checked controls, selected navigation with metadata, small
status tags, tables, filters, a modal/drawer and authentication pages. Scanned documents retain
their original colors.

The package tests computed tokens for all accents in both themes: body/link/placeholder/action
text at least 4.5:1, and form boundaries/focus at least 3:1. Brand action fills may be brighter than
that against the canvas; their label uses a separately contrasted foreground. These checks do not
replace verification of host-specific combinations or imply an audit of the entire application.

The npm archive contains this guide, the README, generated types/ESM/CommonJS/CSS and the existing
licensed fonts. A clean consumer build must not depend on a sibling checkout, a copied theme or
an unpublished tarball.

# @joshuan/design-system

## 0.3.0

### Minor Changes

- Introduce a warm amber brand and higher-contrast shared light/dark foundations. Separate action,
  text, selection and on-brand roles; coordinate controls, navigation, focus and named status tags.
  Include the consumer migration guide in the published package. Remove the ambiguous Palette.accent
  field; use primary for brand fills or warning for warning semantics.

## 0.2.1

### Patch Changes

- f91cac4: Bundle the verified IBM Plex font files and license with the shared stylesheet so application builds do not depend on Google Fonts responses. Preserve the existing font weights, Unicode ranges and fallback metrics.

## 0.2.0

### Minor Changes

- cae500f: Introduce the common application design: two product accents on one neutral palette, Ant Design 6
  tokens, responsive page headings and SSR-safe system appearance. Used by Legere and Rent Manager.

  Share responsive navigation and accessible home brands between both applications.

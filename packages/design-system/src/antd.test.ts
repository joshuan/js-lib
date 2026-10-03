import { describe, expect, it } from 'vitest';
import { theme } from 'antd';
import { createAppTheme } from './antd.js';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageHeader } from './react.js';

function luminance(hex: string): number {
  const channel = (start: number): number => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(foreground: string, background: string): number {
  const text = luminance(foreground);
  const surface = luminance(background);
  return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
}

for (const accent of ['green', 'blue', 'amber'] as const) {
  describe(`${accent} theme`, () => {
    const appTheme = (dark: boolean) => createAppTheme({ dark, accent });
    it('keeps small secondary text readable on working and feedback surfaces in both themes', () => {
      for (const dark of [false, true]) {
        const token = theme.getDesignToken(appTheme(dark));
        for (const background of [
          token.colorBgLayout,
          token.colorBgContainer,
          token.colorBgElevated,
          token.colorPrimaryBg,
          token.colorPrimaryBgHover,
          token.colorFillAlter,
          token.colorInfoBg,
          token.colorSuccessBg,
          token.colorWarningBg,
          token.colorErrorBg,
        ]) {
          expect(
            contrast(token.colorTextSecondary, background),
            `${dark ? 'dark' : 'light'} secondary text on ${background}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it('retains the designed brand fills after Ant Design generates each theme', () => {
      for (const dark of [false, true]) {
        const config = appTheme(dark);
        const token = theme.getDesignToken(config);
        expect(token.colorPrimary).toBe(config.token?.colorPrimary);
        expect(token.colorLink).toBe(config.token?.colorLink);
      }
    });

    it('keeps the product colour away from error, so a warning never reads as a failure', () => {
      for (const dark of [false, true]) {
        const token = theme.getDesignToken(appTheme(dark));
        expect(token.colorPrimary).not.toBe(token.colorError);
        expect(token.colorPrimary).not.toBe(token.colorSuccess);
      }
    });

    it('keeps primary, danger and selected navigation labels readable in enabled states', () => {
      for (const dark of [false, true]) {
        const config = appTheme(dark);
        const token = theme.getDesignToken(config);
        for (const background of [
          token.colorPrimary,
          token.colorPrimaryHover,
          token.colorPrimaryActive,
        ]) {
          expect(contrast(token.colorTextLightSolid, background)).toBeGreaterThanOrEqual(4.5);
        }
        for (const background of [
          token.colorError,
          token.colorErrorHover,
          token.colorErrorActive,
        ]) {
          expect(
            contrast(config.components?.Button?.dangerColor ?? '', background),
          ).toBeGreaterThanOrEqual(4.5);
        }
        expect(
          contrast(
            config.components?.Menu?.itemSelectedColor ?? '',
            config.components?.Menu?.itemSelectedBg ?? '',
          ),
        ).toBeGreaterThanOrEqual(4.5);
        expect(contrast(token.colorPrimaryText, token.colorPrimaryBg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(token.colorPrimaryText, token.colorPrimaryBgHover)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    });

    it('keeps links, placeholders, focus and control boundaries visible on working surfaces', () => {
      for (const dark of [false, true]) {
        const token = theme.getDesignToken(appTheme(dark));
        for (const background of [
          token.colorBgLayout,
          token.colorBgContainer,
          token.colorBgElevated,
        ]) {
          for (const foreground of [
            token.colorLink,
            token.colorLinkHover,
            token.colorLinkActive,
            token.colorTextPlaceholder,
          ]) {
            expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
          }
          expect(contrast(token.colorBorder, background)).toBeGreaterThanOrEqual(3);
          expect(contrast(token.colorPrimaryText, background)).toBeGreaterThanOrEqual(3);
        }
        for (const role of ['Info', 'Success', 'Warning', 'Error'] as const) {
          expect(
            contrast(token[`color${role}Text`], token[`color${role}Bg`]),
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it('binds the two faces through CSS variables the layout defines', () => {
      const { token } = appTheme(false);

      expect(token?.fontFamily).toBe(
        'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
      );
      expect(token?.fontFamilyCode).toBe('var(--font-mono, ui-monospace, monospace)');
    });

    it('exposes tokens as CSS variables, which is what the stylesheet dresses the page with', () => {
      expect(appTheme(false).cssVar).toEqual({ prefix: 'ant' });
    });

    it('gives the layout chrome its own surfaces instead of antd defaults', () => {
      const { components, token } = appTheme(true);

      expect(components?.Layout?.siderBg).toBe(token?.colorBgContainer);
      expect(components?.Layout?.bodyBg).toBe(token?.colorBgLayout);
      // The shared navigation does not introduce a global desktop header.
      expect(components?.Layout?.headerBg).toBeUndefined();
    });
  });
}

it('renders a semantic heading and supplied navigation without depending on Next or translations', () => {
  const markup = renderToStaticMarkup(
    createElement(PageHeader, {
      title: 'Documents',
      description: 'Private archive',
      meta: 0,
      back: createElement('a', { href: '/apartments/1' }, 'Apartment'),
      actions: createElement('button', { type: 'button' }, 'Upload'),
    }),
  );
  expect(markup.match(/<h1/g)).toHaveLength(1);
  expect(markup).toContain('href="/apartments/1"');
  expect(markup).toContain('jui-page-meta">0</div>');
  expect(markup).toContain('type="button"');
  expect(markup).not.toContain('<main');
});

for (const dark of [false, true]) {
  it(`keeps named tags and form states readable (dark: ${dark})`, () => {
    const config = createAppTheme({ dark, accent: 'amber' });
    const token = theme.getDesignToken(config);
    for (const color of ['green', 'red', 'blue', 'orange', 'gold', 'purple'] as const) {
      expect(token[`${color}-7`]).toBe(token[`${color}7`]);
      expect(token[`${color}-1`]).toBe(token[`${color}1`]);
      expect(contrast(token[`${color}7`], token[`${color}1`]), color).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(config.components?.Tag?.colorTextLightSolid ?? '', token[`${color}6`]),
        `${color} solid`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrast(config.components?.Button?.defaultHoverColor ?? '', token.colorBgContainer),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(
        config.components?.Checkbox?.colorWhite ?? '',
        config.components?.Checkbox?.colorPrimary ?? '',
      ),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrast(
        config.components?.Radio?.colorWhite ?? '',
        config.components?.Radio?.colorPrimary ?? '',
      ),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrast(config.components?.Pagination?.colorPrimary ?? '', token.colorPrimaryBg),
    ).toBeGreaterThanOrEqual(4.5);
  });
}

it('disables generated motion when the system requests it', () => {
  expect(
    theme.getDesignToken(createAppTheme({ dark: false, accent: 'amber', reducedMotion: true }))
      .motionDurationMid,
  ).toBe('0s');
});

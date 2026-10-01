import { describe, expect, it } from 'vitest';
import { theme } from 'antd';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createAppTheme } from './antd.js';
import { PageHeader } from './react.js';

function luminance(hex: string): number {
  const channel = (start: number) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const accent of ['green', 'blue'] as const) {
  describe(`${accent} theme`, () => {
    it.each([false, true])('keeps computed text and button states readable (dark: %s)', (dark) => {
      const token = theme.getDesignToken(createAppTheme({ dark, accent }));
      const surfaces = [token.colorBgLayout, token.colorBgContainer, token.colorBgElevated];
      for (const foreground of [
        token.colorText,
        token.colorTextSecondary,
        token.colorErrorText,
        token.colorError,
        token.colorPrimary,
        token.colorLinkHover,
      ]) {
        for (const background of surfaces) {
          expect(
            contrast(foreground, background),
            `${foreground} on ${background}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const background of [
        token.colorInfoBg,
        token.colorSuccessBg,
        token.colorWarningBg,
        token.colorErrorBg,
      ]) {
        expect(contrast(token.colorTextSecondary, background)).toBeGreaterThanOrEqual(4.5);
      }
      for (const background of [
        token.colorPrimary,
        token.colorPrimaryHover,
        token.colorPrimaryActive,
        token.colorError,
        token.colorErrorHover,
        token.colorErrorActive,
      ]) {
        expect(
          contrast(token.colorTextLightSolid, background),
          `solid ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
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

import { theme as antdTheme, type ThemeConfig } from 'antd';
import { paletteFor, type Accent } from './palette.js';
import { dimensions, FONT_SANS, FONT_MONO } from './index.js';

export function createAppTheme({
  dark,
  accent,
  reducedMotion = false,
}: {
  dark: boolean;
  accent: Accent;
  reducedMotion?: boolean;
}): ThemeConfig {
  const c = paletteFor(dark, accent);

  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    cssVar: { prefix: 'ant' },
    token: {
      colorPrimary: c.primary,
      colorPrimaryHover: c.primaryHover,
      colorPrimaryActive: c.primaryActive,
      colorPrimaryText: c.primary,
      colorPrimaryTextHover: c.primaryHover,
      colorPrimaryTextActive: c.primaryActive,
      colorLink: c.primary,
      colorLinkHover: c.primaryHover,
      colorLinkActive: c.primaryActive,
      colorInfo: c.info,
      colorSuccess: c.success,
      colorWarning: c.warning,
      colorError: c.error,
      colorErrorText: c.error,
      colorErrorHover: dark ? '#F2ABB0' : '#9F3240',
      colorErrorActive: dark ? '#DA7F87' : '#852936',
      colorErrorTextHover: dark ? '#F2ABB0' : '#9F3240',
      colorErrorTextActive: dark ? '#DA7F87' : '#852936',
      colorSuccessText: c.success,
      colorWarningText: c.warning,
      colorInfoText: c.info,
      colorBgBase: dark ? c.page : c.surface,
      colorFillAlter: dark ? c.surfaceRaised : c.page,
      motion: !reducedMotion,

      // The default palette generator makes pale surfaces muddy when the seed is a dark,
      // accessible accent. Keep light feedback surfaces quiet and their text readable.
      ...(!dark && {
        colorPrimaryBg: accent === 'green' ? '#EAF4F0' : '#ECF2FD',
        colorPrimaryBgHover: accent === 'green' ? '#DCEEE6' : '#DCE7FA',
        colorPrimaryBorder: accent === 'green' ? '#AFCFC4' : '#B5C9EF',
        colorPrimaryBorderHover: accent === 'green' ? '#87B8A8' : '#86A7E0',
        colorInfoBg: accent === 'green' ? '#F2F9F6' : '#F2F6FD',
        colorInfoBgHover: accent === 'green' ? '#E3F1EB' : '#E3EBFA',
        colorInfoBorder: accent === 'green' ? '#B7D8CD' : '#B5C9EF',
        colorSuccessBg: '#F1F9F3',
        colorSuccessBgHover: '#E0EFE4',
        colorSuccessBorder: '#BFDDC7',
        colorWarningBg: '#FCF8EE',
        colorWarningBgHover: '#F7EDD4',
        colorWarningBorder: '#E7D6AE',
        colorErrorBg: '#FDF5F6',
        colorErrorBgHover: '#F6E1E5',
        colorErrorBorder: '#ECC5CC',
      }),

      colorBgLayout: c.page,
      colorBgContainer: c.surface,
      colorBgElevated: c.surfaceRaised,
      colorBorder: c.borderStrong,
      colorBorderSecondary: c.border,
      colorText: c.text,
      colorTextSecondary: c.textSecondary,
      colorTextDescription: c.textSecondary,
      colorTextDisabled: c.textSecondary,
      colorTextPlaceholder: c.textSecondary,

      fontFamily: FONT_SANS,
      fontFamilyCode: FONT_MONO,
      fontSize: 14,
      lineHeight: 1.5,

      borderRadius: 6,
      borderRadiusLG: 8,
      borderRadiusSM: 4,
      controlHeight: dimensions.control,
      controlHeightSM: dimensions.controlSmall,
      controlHeightLG: dimensions.touchTarget,
      colorTextLightSolid: dark ? c.page : c.surface,
      fontSizeHeading1: dimensions.pageTitle,
      fontSizeHeading2: 22,
      fontSizeHeading3: 18,
      fontSizeHeading4: 16,
      fontSizeHeading5: 14,
      wireframe: false,

      // Depth is an interaction, not a default: nothing floats at rest.
      boxShadow: dark
        ? '0 1px 2px rgba(0, 0, 0, 0.5), 0 8px 24px -12px rgba(0, 0, 0, 0.7)'
        : '0 1px 2px rgba(24, 45, 54, 0.06), 0 12px 32px -16px rgba(24, 45, 54, 0.20)',
      boxShadowSecondary: dark
        ? '0 6px 20px -8px rgba(0, 0, 0, 0.7)'
        : '0 6px 20px -10px rgba(24, 45, 54, 0.16)',

      motionDurationMid: `${dimensions.motion}ms`,
    },
    components: {
      Layout: {
        bodyBg: c.page,
        siderBg: c.surface,
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemSelectedBg: `${c.primary}${dark ? '1F' : '14'}`,
        itemSelectedColor: c.primary,
        itemHoverBg: dark ? 'rgba(231, 239, 242, 0.05)' : 'rgba(36, 50, 59, 0.04)',
        itemHeight: dimensions.control,
        itemMarginInline: 8,
        itemBorderRadius: 6,
        iconSize: 16,
      },
      Card: {
        colorBorderSecondary: c.border,
        bodyPadding: 20,
        headerHeight: 48,
        headerFontSize: 16,
      },
      Table: {
        headerBg: c.page,
        headerColor: c.textSecondary,
        borderColor: c.border,
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
        cellPaddingBlockSM: 10,
        cellPaddingInlineSM: 12,
        rowHoverBg: `${c.primary}09`,
      },
      Tag: { borderRadiusSM: 4, defaultBg: c.page },
      Button: {
        fontWeight: 500,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
        primaryColor: dark ? c.page : c.surface,
        dangerColor: dark ? c.page : c.surface,
      },
      Input: {
        activeShadow: `0 0 0 3px ${c.primary}26`,
      },
      Statistic: { contentFontSize: 26 },
      Segmented: { itemSelectedBg: c.surfaceRaised },
      Tooltip: {
        colorBgSpotlight: dark ? c.surfaceRaised : c.text,
        colorTextLightSolid: dark ? c.text : c.surface,
      },
      Form: { itemMarginBottom: 20, verticalLabelPadding: '0 0 6px', labelColor: c.text },
      Descriptions: { labelColor: c.textSecondary },
      Tabs: { horizontalItemPadding: '12px 0', horizontalItemGutter: 24, titleFontSize: 14 },
      Modal: { borderRadiusLG: 12, titleFontSize: 18 },
      Drawer: { footerPaddingBlock: 16, footerPaddingInline: 20 },
      DatePicker: { cellWidth: 32, cellHeight: 32 },
    },
  };
}

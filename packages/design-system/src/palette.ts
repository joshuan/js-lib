/** Action fills, text and selected surfaces are distinct roles, including for bright brands. */
export type Accent = 'green' | 'blue' | 'amber';

type BrandPalette = {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  brandText: string;
  onPrimary: string;
  selected: string;
  selectedHover: string;
  brandBorder: string;
  focusShadow: string;
};

const LIGHT = {
  page: '#EDF1F5',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  text: '#14212D',
  textSecondary: '#46586A',
  textMuted: '#526577',
  border: '#C6D0DA',
  borderStrong: '#7D8C9B',
  fill: '#E3EAF0',
  hover: '#E8EEF3',
  tableHead: '#E3EAF0',
  success: '#217A39',
  warning: '#A1430B',
  error: '#C72D48',
  errorHover: '#AF203A',
  errorActive: '#95172E',
  info: '#2165CA',
};

const DARK = {
  page: '#10171F',
  surface: '#1C2834',
  surfaceRaised: '#263646',
  text: '#F2F6FA',
  textSecondary: '#B9C8D6',
  textMuted: '#ACBECE',
  border: '#405469',
  borderStrong: '#7B90A3',
  fill: '#304254',
  hover: '#2B3C4D',
  tableHead: '#2B3C4D',
  success: '#81DD8C',
  warning: '#FFAC79',
  error: '#FF96A8',
  errorHover: '#FFB5C2',
  errorActive: '#F57E94',
  info: '#8CBBFF',
};

const BRANDS: Record<Accent, { light: BrandPalette; dark: BrandPalette }> = {
  green: {
    light: {
      primary: '#007F73',
      primaryHover: '#006E64',
      primaryActive: '#005B53',
      brandText: '#006E64',
      onPrimary: '#FFFFFF',
      selected: '#D5F3EC',
      selectedHover: '#BCEADF',
      brandBorder: '#66B4A5',
      focusShadow: '0 0 0 3px rgba(0, 127, 115, 0.18)',
    },
    dark: {
      primary: '#2DDFC5',
      primaryHover: '#64EBD7',
      primaryActive: '#16BFA9',
      brandText: '#64EBD7',
      onPrimary: '#082C27',
      selected: '#123F3B',
      selectedHover: '#18534B',
      brandBorder: '#278A7D',
      focusShadow: '0 0 0 3px rgba(45, 223, 197, 0.22)',
    },
  },
  blue: {
    light: {
      primary: '#2165CA',
      primaryHover: '#1B55AF',
      primaryActive: '#164590',
      brandText: '#1C56A6',
      onPrimary: '#FFFFFF',
      selected: '#E1EDFF',
      selectedHover: '#CDDEFA',
      brandBorder: '#779DCE',
      focusShadow: '0 0 0 3px rgba(33, 101, 202, 0.18)',
    },
    dark: {
      primary: '#8CBBFF',
      primaryHover: '#B8D6FF',
      primaryActive: '#6BA4F3',
      brandText: '#ACD0FF',
      onPrimary: '#10171F',
      selected: '#203B5D',
      selectedHover: '#294C72',
      brandBorder: '#77A8E6',
      focusShadow: '0 0 0 3px rgba(140, 187, 255, 0.22)',
    },
  },
  amber: {
    light: {
      primary: '#FFBD3E',
      primaryHover: '#F0AC28',
      primaryActive: '#DC9618',
      brandText: '#805000',
      onPrimary: '#332100',
      selected: '#FFF0CB',
      selectedHover: '#FFE3A3',
      brandBorder: '#B17C18',
      focusShadow: '0 0 0 3px rgba(177, 124, 24, 0.22)',
    },
    dark: {
      primary: '#FFBD3E',
      primaryHover: '#FFD16E',
      primaryActive: '#F0AC28',
      brandText: '#FFD16E',
      onPrimary: '#332100',
      selected: '#48361C',
      selectedHover: '#5A4320',
      brandBorder: '#C99A46',
      focusShadow: '0 0 0 3px rgba(255, 189, 62, 0.22)',
    },
  },
};

export type Palette = typeof LIGHT & BrandPalette;

export function paletteFor(dark: boolean, accent: Accent = 'green'): Palette {
  return { ...(dark ? DARK : LIGHT), ...BRANDS[accent][dark ? 'dark' : 'light'] };
}

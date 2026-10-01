export type Palette = {
  page: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryHover: string;
  primaryActive: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
};

const LIGHT: Palette = {
  page: '#F5F7F8',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#DEE5E8',
  borderStrong: '#BCC9CF',
  text: '#24323B',
  textSecondary: '#5F7079',
  primary: '#247463',
  primaryHover: '#1E6657',
  primaryActive: '#195A4D',
  accent: '#936719',
  success: '#34764A',
  warning: '#936719',
  error: '#B43F4D',
  info: '#247463',
};

const DARK: Palette = {
  page: '#121A1E',
  surface: '#1A252B',
  surfaceRaised: '#223139',
  border: '#30434B',
  borderStrong: '#58707B',
  text: '#E7EFF2',
  textSecondary: '#A2B3BA',
  primary: '#73C4AF',
  primaryHover: '#94D7C5',
  primaryActive: '#56A68F',
  accent: '#E0B56C',
  success: '#88C89E',
  warning: '#E0B56C',
  error: '#FF9C9C',
  info: '#73C4AF',
};

export type Accent = 'green' | 'blue';

export function paletteFor(dark: boolean, accent: Accent = 'green'): Palette {
  const neutral = dark ? DARK : LIGHT;
  if (accent === 'green') return { ...neutral };
  return {
    ...neutral,
    primary: dark ? '#82ADFF' : '#245FC8',
    primaryHover: dark ? '#ADCAFF' : '#1D54B5',
    primaryActive: dark ? '#6A98EC' : '#164DA9',
    info: dark ? '#82ADFF' : '#245FC8',
  };
}

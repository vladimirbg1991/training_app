/**
 * Pulse design system color constants.
 *
 * Use these in RN style props (contentStyle, tabBarStyle, etc.) where
 * NativeWind className is not available. For className usage, use the
 * Tailwind tokens defined in tailwind.config.ts (e.g., "bg-page").
 */
export const Colors = {
  page: '#0A1410',
  card: '#0E1F19',
  hero: '#0F6E56',
  statTile: '#08402F',
  accent: '#1D9E75',
  accentText: '#04342C',
  primary: '#E1F5EE',
  label: '#5DCAA5',
  ambient: '#9FE1CB',
  borderSubtle: '#08402F',
  borderActive: '#5DCAA5',
  amber: '#FAC775',
  amberText: '#412402',
  amberBg: '#633806',
  coral: '#F0997B',
  coralText: '#4A1B0C',
  positive: '#97C459',
} as const;

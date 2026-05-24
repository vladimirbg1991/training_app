import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Surface stack (4-tier model)
        page: '#0A1410',
        card: '#0E1F19',
        hero: '#0F6E56',
        'stat-tile': '#08402F',

        // Primary accent — one per screen
        accent: {
          DEFAULT: '#1D9E75',
          text: '#04342C',
        },

        // Semantic colours
        amber: {
          DEFAULT: '#FAC775',
          text: '#412402',
          bg: '#633806',
        },
        coral: {
          DEFAULT: '#F0997B',
          text: '#4A1B0C',
          bg: '#4A1B0C',
        },
        positive: '#97C459',

        // Text hierarchy on dark surfaces
        primary: '#E1F5EE',
        label: '#5DCAA5',
        ambient: '#9FE1CB',

        // Border tokens
        'border-subtle': '#08402F',
        'border-active': '#5DCAA5',
      },
      borderRadius: {
        'card': '14px',
        'card-hero': '16px',
        'btn': '12px',
        'btn-sm': '10px',
        'pill': '7px',
      },
      fontSize: {
        'display': ['36px', { lineHeight: '1.15', fontWeight: '500', letterSpacing: '-0.02em' }],
        'hero-num': ['26px', { lineHeight: '1.2', fontWeight: '500', letterSpacing: '-0.02em' }],
        'title': ['20px', { lineHeight: '1.3', fontWeight: '500' }],
        'subtitle': ['15px', { lineHeight: '1.35', fontWeight: '500' }],
        'body-sm': ['12px', { lineHeight: '1.4' }],
        'label-xs': ['10px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
      },
      spacing: {
        'card-pad': '14px',
        'card-gap': '10px',
        'section': '16px',
      },
      minHeight: {
        'tap': '44px',
        'btn': '52px',
        'btn-sm': '38px',
      },
    },
  },
  plugins: [],
} satisfies Config;

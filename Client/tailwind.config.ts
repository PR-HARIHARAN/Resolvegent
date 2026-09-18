import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep Monochromatic Black Theme
        background: {
          DEFAULT: '#000000', // Pure pitch black app surface
          pure: '#0A0A0A',    // Deep surface for cards / elevated containers
          subtle: '#141414',  // Subtle container / table header / hover background
          muted: '#1E1E1E',   // Inset backgrounds
        },
        foreground: {
          DEFAULT: '#FFFFFF', // Crisp pure white text
          secondary: '#E5E5E5', // Secondary body readability text
          muted: '#A3A3A3',   // Metadata, subtitles, timestamps
          subtle: '#737373',  // Placeholders, disabled text, subtle icons
        },
        border: {
          DEFAULT: '#262626', // Crisp dark gray boundary
          subtle: '#1C1C1C',  // Ultra-light inner dividers
          strong: '#FFFFFF',  // High-contrast active borders
        },
        action: {
          primary: '#FFFFFF',      // High-contrast white primary button
          'primary-hover': '#E5E5E5',
          'primary-active': '#CCCCCC',
          'primary-fg': '#000000',
          secondary: '#0A0A0A',
          'secondary-hover': '#171717',
          'secondary-border': '#262626',
          'secondary-fg': '#FFFFFF',
        },
        // Strict Semantic Accent Tokens (Strictly for Status / Severity / Telemetry)
        severity: {
          critical: {
            DEFAULT: '#EF4444',
            fg: '#FCA5A5',
            bg: '#450A0A',
            border: '#7F1D1D',
            dot: '#EF4444',
          },
          high: {
            DEFAULT: '#F97316',
            fg: '#FDBA74',
            bg: '#431407',
            border: '#7C2D12',
            dot: '#F97316',
          },
          medium: {
            DEFAULT: '#F59E0B',
            fg: '#FCD34D',
            bg: '#451A03',
            border: '#78350F',
            dot: '#F59E0B',
          },
          low: {
            DEFAULT: '#9CA3AF',
            fg: '#D1D5DB',
            bg: '#1F2937',
            border: '#374151',
            dot: '#9CA3AF',
          },
          info: {
            DEFAULT: '#3B82F6',
            fg: '#93C5FD',
            bg: '#172554',
            border: '#1E3A8A',
            dot: '#3B82F6',
          },
          resolved: {
            DEFAULT: '#22C55E',
            fg: '#86EFAC',
            bg: '#052E16',
            border: '#14532D',
            dot: '#22C55E',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.02em' }], // 11px
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],           // 12px / 16px
        sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0' }],           // 14px / 20px
        base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],        // 16px / 24px
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em' }],    // 18px / 28px
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em' }],      // 20px / 28px
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.025em' }],       // 24px / 32px
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.03em' }],   // 30px / 36px
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
      },
      boxShadow: {
        none: 'none',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5)',
        subtle: '0 2px 4px 0 rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}

export default config

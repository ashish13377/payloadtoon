import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}', './src/lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: 'rgba(15, 18, 30, 0.6)',
          solid: '#0f121e',
          raised: 'rgba(22, 27, 45, 0.8)',
          overlay: 'rgba(30, 35, 55, 0.65)',
        },
        accent: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
          muted: 'rgba(99, 102, 241, 0.15)',
        },
        success: {
          DEFAULT: '#10b981',
          muted: 'rgba(16, 185, 129, 0.15)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          muted: 'rgba(245, 158, 11, 0.15)',
        },
        danger: {
          DEFAULT: '#ef4444',
          muted: 'rgba(239, 68, 68, 0.15)',
        },
      },
      boxShadow: {
        soft: '0 20px 70px rgba(0, 0, 0, 0.25)',
        glow: '0 0 40px rgba(99, 102, 241, 0.15)',
        'glow-lg': '0 0 80px rgba(99, 102, 241, 0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        shimmer: 'shimmer 2.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%, 100%': { backgroundPosition: '200% 0' },
          '50%': { backgroundPosition: '-200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.25)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':
          'radial-gradient(at 40% 20%, rgba(99, 102, 241, 0.12) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(16, 185, 129, 0.08) 0px, transparent 50%), radial-gradient(at 10% 90%, rgba(245, 158, 11, 0.06) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
};

export default config;

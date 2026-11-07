import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    resolve(configDirectory, 'index.html'),
    resolve(configDirectory, 'src/**/*.{js,ts,jsx,tsx}'),
  ],

  darkMode: 'class',

  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"DM Sans"', '"Segoe UI"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      colors: {
        kanbot: {
          // =====================================
          // LIGHT MODE
          // =====================================
          background: '#F3F5F9',
          surface: '#FFFFFF',
          'surface-elevated': '#FFFFFF',
          hover: '#E9EFFB',

          text: '#172B4D',
          muted: '#626F86', // secondary text
          subdued: '#8993A4', // muted text (use for non-essential info only)
          border: '#D3DAE6',

          primary: {
            DEFAULT: 'hsl(var(--kanbot-primary) / <alpha-value>)',
            hover: 'hsl(var(--kanbot-primary-hover) / <alpha-value>)',
            active: 'hsl(var(--kanbot-primary-active) / <alpha-value>)',
            soft: 'hsl(var(--kanbot-primary-soft) / <alpha-value>)',
          },

          sage: { DEFAULT: '#218653', soft: '#DDF3E5' },
          info: { DEFAULT: '#2563EB', soft: '#E9EFFB' },
          warning: { DEFAULT: '#C47716', soft: '#FFF0D2' },
          danger: { DEFAULT: '#D13D4B', soft: '#FCE3E6' },

          // =====================================
          // SIDEBAR - CSS VARIABLES
          // =====================================
          sidebar: {
            DEFAULT: 'hsl(var(--kanbot-sidebar-bg) / <alpha-value>)',
            hover: 'hsl(var(--kanbot-sidebar-hover) / <alpha-value>)',
            active: 'hsl(var(--kanbot-sidebar-active) / <alpha-value>)',
            text: 'hsl(var(--kanbot-sidebar-text) / <alpha-value>)',
            muted: 'hsl(var(--kanbot-sidebar-muted) / <alpha-value>)',
            border: 'hsl(var(--kanbot-sidebar-border) / <alpha-value>)',
            'active-text': 'hsl(var(--kanbot-sidebar-active-text) / <alpha-value>)',
            accent: 'hsl(var(--kanbot-sidebar-accent) / <alpha-value>)',
            'accent-text': 'hsl(var(--kanbot-sidebar-accent-text) / <alpha-value>)',
          },

          // =====================================
          // DARK MODE
          // =====================================
          dark: {
            background: '#101827',
            surface: '#182438',
            'surface-elevated': '#22334A',
            hover: '#22334A',

            text: '#E6EDF7',
            muted: '#9AA9BD',
            subdued: '#75869D',
            border: '#2B3A50',

            primary: '#5794F7',
            'primary-hover': '#76A8FA',
            'primary-active': '#3F7DE0',
            'primary-soft': '#22334A',

            sage: '#69B88C',
            'sage-soft': '#20382F',

            info: '#5794F7',
            'info-soft': '#22334A',

            warning: '#F0B66D',
            'warning-soft': '#382D27',

            danger: '#F87171',
            'danger-soft': '#3A252B',
          },

          // =====================================
          // KANBAN COLUMNS - LIGHT (soft tints, not saturated)
          // =====================================
          'col-todo': '#EAF1FE',
          'col-todo-border': '#C7D9F9',
          'col-todo-accent': '#2563EB',

          'col-progress': '#F0EBFE',
          'col-progress-border': '#DBD1F7',
          'col-progress-accent': '#7C3AED',

          'col-review': '#FEF0DF',
          'col-review-border': '#F5D8B3',
          'col-review-accent': '#EA7A12',

          'col-done': '#E4F5EA',
          'col-done-border': '#BFE3CC',
          'col-done-accent': '#16A34A',

          // =====================================
          // KANBAN COLUMNS - DARK
          // =====================================
          'dark-col-todo': '#1C2A42',
          'dark-col-todo-border': '#2F4767',
          'dark-col-todo-accent': '#5794F7',

          'dark-col-progress': '#28243E',
          'dark-col-progress-border': '#3F3763',
          'dark-col-progress-accent': '#A78BFA',

          'dark-col-review': '#382D27',
          'dark-col-review-border': '#5A4430',
          'dark-col-review-accent': '#F0B66D',

          'dark-col-done': '#20382F',
          'dark-col-done-border': '#2F5543',
          'dark-col-done-accent': '#69B88C',
        },
      },
    },
  },

  plugins: [],
};

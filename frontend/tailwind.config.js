/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surface layers
        'surface':                  '#10131b',
        'surface-dim':              '#10131b',
        'surface-bright':           '#363942',
        'surface-container-lowest': '#0b0e16',
        'surface-container-low':    '#181b23',
        'surface-container':        '#1c2028',
        'surface-container-high':   '#272a32',
        'surface-container-highest':'#31353d',
        'surface-variant':          '#31353d',
        'surface-tint':             '#aec6ff',
        'background':               '#10131b',

        // On-surface
        'on-surface':               '#e0e2ed',
        'on-surface-variant':       '#c1c6d7',
        'on-background':            '#e0e2ed',

        // Primary
        'primary':                  '#aec6ff',
        'primary-container':        '#4d8eff',
        'primary-fixed':            '#d8e2ff',
        'primary-fixed-dim':        '#aec6ff',
        'on-primary':               '#002e6a',
        'on-primary-container':     '#00285d',
        'on-primary-fixed':         '#001a42',
        'on-primary-fixed-variant': '#004395',
        'inverse-primary':          '#005ac3',

        // Secondary
        'secondary':                    '#c7c6c6',
        'secondary-container':          '#484949',
        'secondary-fixed':              '#e3e2e2',
        'secondary-fixed-dim':          '#c7c6c6',
        'on-secondary':                 '#2f3131',
        'on-secondary-container':       '#b8b8b8',
        'on-secondary-fixed':           '#1a1c1c',
        'on-secondary-fixed-variant':   '#464747',

        // Tertiary
        'tertiary':                     '#ffb596',
        'tertiary-container':           '#f0661c',
        'tertiary-fixed':               '#ffdbcd',
        'tertiary-fixed-dim':           '#ffb596',
        'on-tertiary':                  '#581e00',
        'on-tertiary-container':        '#4d1900',
        'on-tertiary-fixed':            '#360f00',
        'on-tertiary-fixed-variant':    '#7d2d00',

        // Utility
        'outline':          '#8b90a0',
        'outline-variant':  '#414755',
        'inverse-surface':      '#e0e2ed',
        'inverse-on-surface':   '#2d3039',

        // Error
        'error':            '#ffb4ab',
        'error-container':  '#93000a',
        'on-error':         '#690005',
        'on-error-container': '#ffdad6',
      },
    },
  },
  plugins: [],
};
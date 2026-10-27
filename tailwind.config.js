const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const HUES = ['amber', 'blue', 'cyan', 'emerald', 'gray', 'green', 'indigo', 'orange', 'pink', 'purple', 'red', 'rose', 'sky', 'slate', 'teal', 'violet', 'yellow'];

// Cada tono lee sus valores de src/theme.css (claro y oscuro), generado por scripts/gen-theme.mjs.
const themed = Object.fromEntries(
  HUES.map((hue) => [hue, Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--c-${hue}-${s}) / <alpha-value>)`]))])
);

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: themed,
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        // Plano, como las listas agrupadas de iOS: sin sombra; el contraste lo da el fondo.
        sm: 'none',
      },
    },
  },
};

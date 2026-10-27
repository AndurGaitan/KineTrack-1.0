// Genera src/theme.css: variables de color (claro y oscuro) para toda la paleta de Tailwind que usa la app.
// Uso: node scripts/gen-theme.mjs
// El modo oscuro refleja cada escala (50↔900, 100↔800...) para que los fondos tintados y los textos de
// cada tono sigan siendo legibles sin reescribir las pantallas; gris, blanco y azul de marca son a medida.
import colors from 'tailwindcss/colors.js';
import { writeFileSync } from 'node:fs';

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const HUES = ['amber', 'blue', 'cyan', 'emerald', 'green', 'indigo', 'orange', 'pink', 'purple', 'red', 'rose', 'sky', 'teal', 'violet', 'yellow'];

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
const fmt = (rgb) => rgb.join(' ');
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

// Escalas claras
const light = {};
for (const h of HUES) light[h] = Object.fromEntries(SHADES.map((s) => [s, hex2rgb(colors[h][s])]));

// Azul de marca KineTrack (#1E73C8 = 600)
const brand = hex2rgb('#1e73c8');
light.blue = {
  50: mix(brand, WHITE, 0.93),
  100: mix(brand, WHITE, 0.85),
  200: mix(brand, WHITE, 0.7),
  300: mix(brand, WHITE, 0.52),
  400: mix(brand, WHITE, 0.28),
  500: mix(brand, WHITE, 0.1),
  600: brand,
  700: mix(brand, BLACK, 0.2),
  800: mix(brand, BLACK, 0.38),
  900: mix(brand, BLACK, 0.55),
};
// El índigo de la app acompaña al azul de marca
light.sky = light.cyan;

// Gris tipo iOS
const grayLight = { 50: '#f2f2f7', 100: '#ebebf0', 200: '#dcdce1', 300: '#c7c7cc', 400: '#9a9aa0', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' };
const grayDark = { 50: '#000000', 100: '#2c2c2e', 200: '#38383a', 300: '#48484a', 400: '#6e6e73', 500: '#8e8e93', 600: '#aeaeb2', 700: '#c7c7cc', 800: '#e5e5ea', 900: '#f5f5f7' };
light.gray = Object.fromEntries(SHADES.map((s) => [s, hex2rgb(grayLight[s])]));
const darkGray = Object.fromEntries(SHADES.map((s) => [s, hex2rgb(grayDark[s])]));

// Mapa de escala para el modo oscuro y cuánto se oscurecen los tintes de fondo
const MAP = { 50: 900, 100: 800, 200: 700, 300: 600, 400: 500, 500: 400, 600: 500, 700: 300, 800: 200, 900: 100 };
const DIM = { 50: 0.5, 100: 0.6, 200: 0.72, 300: 0.88 };
const dark = {};
for (const h of HUES) {
  dark[h] = Object.fromEntries(
    SHADES.map((s) => {
      const base = light[h][MAP[s]];
      return [s, DIM[s] ? mix(BLACK, base, DIM[s]) : base];
    })
  );
}

const lines = (scale) =>
  Object.entries(scale)
    .flatMap(([h, shades]) => Object.entries(shades).map(([s, rgb]) => `  --c-${h}-${s}: ${fmt(rgb)};`))
    .join('\n');
const allLight = { ...light, gray: light.gray };
const allDark = { ...dark, gray: darkGray };
// slate se comporta como gris
const slateAlias = (scale) => SHADES.map((s) => `  --c-slate-${s}: ${fmt(scale.gray[s])};`).join('\n');

const surfaceLight = '255 255 255';
const surfaceDark = '28 28 30';

const css = `/* Archivo generado por scripts/gen-theme.mjs — no editar a mano. */
:root {
${lines(allLight)}
${slateAlias(allLight)}
  --surface: ${surfaceLight};
  --hairline: 60 60 67;
  --hairline-alpha: 0.12;
  --bar: 249 249 249;
  --bar-alpha: 0.82;
  --accent: 30 115 200;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${lines(allDark).replace(/^/gm, '  ')}
${slateAlias(allDark).replace(/^/gm, '  ')}
    --surface: ${surfaceDark};
    --hairline: 84 84 88;
    --hairline-alpha: 0.6;
    --bar: 28 28 30;
    --bar-alpha: 0.8;
    --accent: 74 155 232;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${lines(allDark)}
${slateAlias(allDark)}
  --surface: ${surfaceDark};
  --hairline: 84 84 88;
  --hairline-alpha: 0.6;
  --bar: 28 28 30;
  --bar-alpha: 0.8;
  --accent: 74 155 232;
  color-scheme: dark;
}
`;
writeFileSync(new URL('../src/theme.css', import.meta.url), css);
console.log('src/theme.css generado');

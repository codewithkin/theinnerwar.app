// The Inner War design tokens as plain values, for places CSS variables can't
// reach (React Native, canvas, emails, OG images). Mirrors styles/globals.css.

export const palette = {
  ember: "#e2701f",
  emberLight: "#f2a03d",
  emberDeep: "#b8430f",
  emberInk: "#c2551a",
  emberGlow: "#f0a557",
  emberPale: "#f5c07a",
  charcoal: "#131110",
  night: "#0f0d0c",
  ink: "#0b0a09",
  bone: "#f4efe6",
  cream: "#f7f2e8",
  paper: "#f9f5ec",
  muted: "#a79c8e",
  sand: "#b4ada0",
  parchment: "#cfc6b8",
  ash: "#8a8478",
  stone: "#6b6558",
  slate: "#5c564d",
  buttonInk: "#fff6ea",
} as const;

export const fonts = {
  serif: "Newsreader",
  sans: "Archivo",
  mono: "JetBrains Mono",
} as const;

/** The ember mark, on a 0 0 100 100 viewBox (designs/Icon/mark.svg). */
export const EMBER_PATH =
  "M50 8 C50 30 78 34 78 58 A28 28 0 0 1 22 58 C22 42 34 40 38 28 C44 40 54 40 54 52 A9 9 0 0 1 36 52 C30 62 36 76 50 76 C64 76 70 64 70 56 C70 34 50 30 50 8 Z";

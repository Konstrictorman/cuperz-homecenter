import { createTheme } from '@mui/material/styles'

// Opt in to MUI's CSS theme variables (`theme.vars`, `cssVariables` options,
// `colorSchemeNode`/`storageManager` props on ThemeProvider).
declare module '@mui/material/styles' {
  interface CssThemeVariables {
    enabled: true
  }
}

/**
 * The real MUI theme for the platform.
 *
 * Values mirror `src/tokens.css` (auto-generated from the Figma design tokens).
 * They are inlined here as literals rather than `var(--palette-*)` references so
 * that MUI's colour math (`alpha()`, contrast calculation, channel tokens) works
 * — MUI cannot decompose a `var()` string.
 *
 * Dark mode is driven by the same `data-theme` attribute the rest of the app
 * uses (`ThemeContext` / the blocking script in `__root.tsx`): `cssVariables`
 * emits both colour schemes as CSS custom properties and
 * `colorSchemeSelector: 'data-theme'` scopes the dark set under
 * `[data-theme="dark"]`. No React re-render is needed to switch — and there is
 * no SSR flash, because the attribute is set before first paint.
 *
 * When the tokens change in Figma, update `tokens.css` AND the maps below.
 */

const lightPalette = {
  mode: 'light' as const,
  primary: {
    main: '#cf2025',
    dark: '#931a1e',
    light: '#e3878a',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#424242',
    dark: '#2e2e2e',
    light: '#6b6b6b',
    contrastText: '#ffffff',
  },
  error: {
    main: '#e4341b',
    dark: '#982616',
    light: '#e79084',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f59e0a',
    dark: '#a36a0b',
    light: '#efc47b',
    contrastText: '#000000',
  },
  info: {
    main: '#0eaaf1',
    dark: '#0e72a0',
    light: '#7dcaed',
    contrastText: '#ffffff',
  },
  success: {
    main: '#1ee166',
    dark: '#189546',
    light: '#85e5a8',
    contrastText: '#ffffff',
  },
  text: {
    primary: '#2e2e2e',
    secondary: '#6b6b6b',
    disabled: '#b5b5b5',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
  },
  divider: '#d1d1d1',
  action: {
    active: 'rgba(0, 0, 0, 0.54)',
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
    focus: 'rgba(0, 0, 0, 0.12)',
  },
}

const darkPalette = {
  mode: 'dark' as const,
  primary: {
    main: '#e05256',
    dark: '#ba1d21',
    light: '#e3878a',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#b5b5b5',
    dark: '#d1d1d1',
    light: '#808080',
    contrastText: '#000000',
  },
  error: {
    main: '#e5604d',
    dark: '#bf2c17',
    light: '#e79084',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f2b040',
    dark: '#ce8408',
    light: '#efc47b',
    contrastText: '#000000',
  },
  info: {
    main: '#43baef',
    dark: '#0c8fca',
    light: '#7dcaed',
    contrastText: '#ffffff',
  },
  success: {
    main: '#4fe386',
    dark: '#19bd56',
    light: '#85e5a8',
    contrastText: '#ffffff',
  },
  text: {
    primary: '#ffffff',
    secondary: '#b5b5b5',
    disabled: '#575757',
  },
  background: {
    default: '#0a0d0f',
    paper: '#2e2e2e',
  },
  divider: '#424242',
  action: {
    active: 'rgba(255, 255, 255, 0.7)',
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
    focus: 'rgba(255, 255, 255, 0.12)',
  },
}

/**
 * Typography sizes reference the responsive `--typography-*` custom properties
 * from `tokens.css` (which re-declare themselves at the 768px / 1025px
 * breakpoints), so MUI's `Typography` scale stays in sync with the design
 * tokens without `responsiveFontSizes()`.
 */
const variant = (name: string) => ({
  fontSize: `var(--typography-${name}-font-size)`,
  lineHeight: `var(--typography-${name}-line-height)`,
})

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-theme',
  },
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  defaultColorScheme: 'light',
  shape: {
    // --radius-8
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'var(--font-family-sans)',
    // tokens.css defines --font-weight-medium as 700 (used for emphasis
    // throughout the component CSS); mirror that here so MUI internals agree.
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 700,
    fontWeightBold: 700,
    h1: variant('h1'),
    h2: variant('h2'),
    h3: variant('h3'),
    h4: variant('h4'),
    h5: variant('h5'),
    h6: variant('h6'),
    subtitle1: variant('subtitle1'),
    subtitle2: variant('subtitle2'),
    body1: variant('body1'),
    body2: variant('body2'),
    button: { ...variant('button'), textTransform: 'none' },
    caption: variant('caption'),
    overline: variant('overline'),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // was `.button { text-transform: none !important }` in Button.css
          textTransform: 'none',
          textDecoration: 'none',
        },
      },
    },
  },
})

export default theme

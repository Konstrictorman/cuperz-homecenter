import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { theme } from '#/theme'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'cuperz-theme'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

/** What the server renders — it can't know the user's stored preference. */
const SSR_THEME: Theme = 'light'

/** The blocking script in `__root.tsx` has already resolved the preference
 *  (localStorage, then `prefers-color-scheme`) onto `data-theme` before
 *  hydration, so that attribute is the source of truth on the client. */
function readClientTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'dark' || attr === 'light' ? attr : SSR_THEME
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // `null` until mounted: the first client render must match the server's
  // HTML (`SSR_THEME`), or React reports a hydration mismatch on anything
  // theme-dependent (e.g. the header's switch `checked` state). The real
  // theme is picked up right after hydration.
  const [mode, setMode] = useState<Theme | null>(null)

  useEffect(() => {
    setMode(readClientTheme())
  }, [])

  useEffect(() => {
    // Skip the pre-mount render, or it would overwrite the stored preference
    // with `SSR_THEME`.
    if (mode === null) return
    document.documentElement.setAttribute('data-theme', mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggleTheme = () => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme: mode ?? SSR_THEME, toggleTheme }}>
      {/*
        One MUI theme carries both colour schemes as CSS variables scoped to the
        `data-theme` attribute (see `theme.cssVariables.colorSchemeSelector`).
        `colorSchemeNode`/`storageManager` are nulled so MUI never reads or
        writes the attribute itself — this component stays the single authority
        over `data-theme`, matching the blocking script in `__root.tsx`.
      */}
      <MuiThemeProvider
        theme={theme}
        colorSchemeNode={null}
        storageManager={null}
      >
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

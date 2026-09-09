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

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggleTheme = () => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme: mode, toggleTheme }}>
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

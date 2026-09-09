import { useEffect } from 'react'
import '../src/styles.css'

import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { theme } from '../src/theme'
import type { Decorator } from '@storybook/react'
import type { Preview } from '@storybook/tanstack-react'

// Mirrors src/routes/__root.tsx / ThemeContext: the app switches themes by
// flipping `data-theme` on the document root, and both the CSS tokens
// (--line, --palette-*, …) and the MUI theme's CSS variables are scoped off
// that attribute. The MUI provider is configured (colorSchemeNode/storageManager
// nulled) not to touch the attribute itself, so the toolbar toggle below stays
// the single source of truth here too.
const withTheme: Decorator = (Story, context) => {
  const mode = context.globals.theme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  return (
    <MuiThemeProvider
      theme={theme}
      colorSchemeNode={null}
      storageManager={null}
    >
      <div
        style={{
          minHeight: '100vh',
          padding: '1rem',
          background: 'var(--bg-base)',
          color: 'var(--body-text)',
        }}
      >
        <Story />
      </div>
    </MuiThemeProvider>
  )
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  globalTypes: {
    theme: {
      description: 'Cuperz light/dark theme (data-theme attribute)',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
}

export default preview

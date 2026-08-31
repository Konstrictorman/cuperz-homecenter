import { useEffect } from 'react'
import '../src/styles.css'

import type { Decorator } from '@storybook/react'
import type { Preview } from '@storybook/tanstack-react'

// Mirrors src/routes/__root.tsx's themeInitScript / ThemeContext: the app
// switches themes by flipping `data-theme` on the document root, and every
// CSS token (--line, --color-palette-*, etc.) is scoped off that attribute.
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '1rem',
        background: 'var(--bg-base)',
        color: 'var(--color-palette-text-primary)',
      }}
    >
      <Story />
    </div>
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
};

export default preview;

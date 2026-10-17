import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import TanstackQueryProvider from '../integrations/tanstack-query/root-provider'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import Header from '#/components/header/Header'
import Footer from '#/components/footer/Footer'
import { ThemeProvider } from '#/contexts/ThemeContext'
import { FeedbackProvider } from '#/contexts/FeedbackContext'
import Breadcrumbs from '#/components/breadcrumbs/Breadcrumbs'
import NotFound from '#/components/notFound/NotFound'
import ErrorComponent from '#/components/errorComponent/ErrorComponent'
import { env } from '#/env'

const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem('cuperz-theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: env.VITE_APP_TITLE ?? 'Cuperz Homecenter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <TanstackQueryProvider queryClient={queryClient}>
          <ThemeProvider>
            <FeedbackProvider>
              <Header />
              <Breadcrumbs />
              <main className="app-main">{children}</main>
              <Footer />
            </FeedbackProvider>
          </ThemeProvider>
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        </TanstackQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}

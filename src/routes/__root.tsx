import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'

import { EpisodeProvider } from '@/lib/episodes'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

import appCss from '../styles.css?url'

// Register service worker for PWA
function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('Service worker registration failed:', error)
      })
    }
  }, [])
}

function NotFoundComponent() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-white mb-2">Page Not Found</h2>
      <p className="text-slate-400 mb-8 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
      >
        Go Home
      </Link>
    </div>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: 'CrimeWeb - Latest True Crime Episodes',
      },
      {
        name: 'description',
        content:
          'Latest episodes from Dateline, 20/20, 48 Hours, Forensic Files and more true crime shows.',
      },
      // PWA meta tags
      {
        name: 'theme-color',
        content: '#0f172a',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'CrimeWeb',
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'apple-touch-icon',
        href: '/icon-192.svg',
      },
    ],
  }),

  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Register service worker for PWA support
  useServiceWorker()

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-slate-900 text-white flex flex-col">
        <EpisodeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </EpisodeProvider>

        {/* Dev tools only in development */}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { SessionProvider } from './components/SessionProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'NeuralX Global — Portal',
  description: 'Portal de socios NeuralX Global, Inc.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}

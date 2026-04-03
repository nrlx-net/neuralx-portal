import type { Metadata } from 'next'
import { SessionProvider } from './components/SessionProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'NeuralX Global — Portal',
  description: 'Portal de socios NeuralX Global, Inc.',
  icons: {
    icon: [
      {
        url: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/perfil_nrlx-net-logo-favicon.png',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/perfil_nrlx-net-logo2.png',
        type: 'image/png',
      },
    ],
  },
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

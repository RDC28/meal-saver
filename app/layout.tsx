import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/providers/auth-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'MealSaver - Save Food. Feed People.',
  description: 'Connect surplus food donors with nearby verified NGOs to reduce waste and nourish communities.',
  icons: {
    icon: '/mealsaver_logo.png',
    apple: '/mealsaver_logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthProvider>
      <html lang="en" className="bg-background">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="font-sans antialiased bg-background">
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </body>
      </html>
    </AuthProvider>
  )
}

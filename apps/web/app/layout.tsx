import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})
const spaceMono = Space_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'Prode Mundial 2026',
  description: 'Hacé tus pronósticos del Mundial 2026 con tus amigos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full dark`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

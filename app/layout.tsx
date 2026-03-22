import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap', // Performance: avoid FOIT (flash of invisible text)
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

/**
 * Static metadata — rendered server-side, zero JS cost.
 * Open Graph tags improve link preview appearance when sharing.
 */
export const metadata: Metadata = {
  title: {
    default: 'AI Planning Agent',
    template: '%s | AI Planning Agent',
  },
  description:
    'A multi-agent AI pipeline that transforms any problem into a structured, editable execution plan with DOCX and PDF export.',
  keywords: ['AI', 'planning', 'agent', 'Gemini', 'execution plan', 'report generator'],
  authors: [{ name: 'AI Planning Agent' }],
  openGraph: {
    title: 'AI Planning Agent',
    description: 'Transform any problem into a structured execution plan using a 3-agent AI pipeline.',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
}

/**
 * Viewport config — separate export per Next.js 15+ requirement.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E40AF',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  )
}

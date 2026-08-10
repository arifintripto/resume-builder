import type { Metadata } from 'next'
import { Source_Sans_3 } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-ss',
})

export const metadata: Metadata = {
  title: 'Resume Builder',
  description: 'Edit a resume directly on an A4 sheet and print it to PDF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={sourceSans.variable}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}

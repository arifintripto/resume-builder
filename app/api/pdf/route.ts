import { existsSync } from 'fs'
import puppeteer from 'puppeteer-core'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// Drives an already-installed browser — no bundled Chromium download.
const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  (process.env.LOCALAPPDATA ?? '') + '\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
]

export async function POST(req: NextRequest) {
  const executablePath = BROWSERS.find((p) => p && existsSync(p))
  if (!executablePath) {
    return new Response(
      'No Chrome or Edge installation found on this machine.',
      { status: 500 }
    )
  }

  const resumeJson = await req.text()
  const host = req.headers.get('host') ?? 'localhost:3000'

  const browser = await puppeteer.launch({ executablePath })
  try {
    const page = await browser.newPage()
    // Seed the headless page's localStorage before the app boots, so it
    // renders exactly the resume the user is looking at.
    await page.evaluateOnNewDocument((data: string) => {
      localStorage.setItem(
        'resume-builder:store',
        `{"activeId":"pdf","items":[{"id":"pdf","data":${data}}]}`
      )
    }, resumeJson)
    await page.goto(`http://${host}/`, { waitUntil: 'load' })
    await page.waitForSelector('.r-h2', { timeout: 15000 })
    await page.evaluate(() => document.fonts.ready)
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true,
    })
    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
      },
    })
  } catch (err) {
    return new Response(`PDF rendering failed: ${String(err)}`, { status: 500 })
  } finally {
    await browser.close()
  }
}

import { NextRequest } from 'next/server'
import { handlers } from '@/auth'

const BASE = process.env.BASE_PATH ?? ''

// Auth.js is configured with the full public basePath (incl. the subpath the
// app is hosted under). Next strips the app basePath before route handlers
// run, so re-prefix the request URL when it's missing — a no-op locally.
function withBasePath(req: NextRequest): NextRequest {
  if (!BASE) return req
  const url = new URL(req.url)
  if (!url.pathname.startsWith(`${BASE}/`)) {
    url.pathname = BASE + url.pathname
    const init: NonNullable<ConstructorParameters<typeof NextRequest>[1]> = {
      method: req.method,
      headers: req.headers,
    }
    if (req.body) {
      init.body = req.body
      ;(init as { duplex?: string }).duplex = 'half'
    }
    return new NextRequest(url, init)
  }
  return req
}

export const GET = (req: NextRequest) => handlers.GET(withBasePath(req))
export const POST = (req: NextRequest) => handlers.POST(withBasePath(req))

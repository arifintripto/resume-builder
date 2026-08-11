import { handlers } from '@/auth'

const BASE = process.env.BASE_PATH ?? ''

// Auth.js is configured with the full public basePath (incl. the subpath the
// app is hosted under). Next strips the app basePath before route handlers
// run, so re-prefix the request URL when it's missing — a no-op locally.
function withBasePath(req: Request): Request {
  if (!BASE) return req
  const url = new URL(req.url)
  if (!url.pathname.startsWith(`${BASE}/`)) {
    url.pathname = BASE + url.pathname
    return new Request(url, req)
  }
  return req
}

type H = Parameters<typeof handlers.GET>[0]

export const GET = (req: Request) => handlers.GET(withBasePath(req) as H)
export const POST = (req: Request) => handlers.POST(withBasePath(req) as H)

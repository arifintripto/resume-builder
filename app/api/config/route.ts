import { authEnabled } from '@/auth'
import { findBrowser } from '@/lib/browser'

export async function GET() {
  return Response.json({
    authEnabled,
    pdfEnabled: !!findBrowser(),
    // temporary deploy diagnostics (non-secret values only)
    diag: {
      basePathEnv: process.env.BASE_PATH ?? null,
      authUrl: process.env.AUTH_URL ?? null,
    },
  })
}

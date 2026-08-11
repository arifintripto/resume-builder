import { authEnabled } from '@/auth'
import { findBrowser } from '@/lib/browser'

export async function GET() {
  return Response.json({ authEnabled, pdfEnabled: !!findBrowser() })
}

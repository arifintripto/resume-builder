import { authEnabled } from '@/auth'

export async function GET() {
  return Response.json({ authEnabled })
}

import { auth } from '@/auth'
import clientPromise, { DB_NAME } from '@/lib/mongo'

export async function GET() {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const col = (await clientPromise).db(DB_NAME).collection('resumes')
  const docs = await col.find({ userId }).sort({ createdAt: 1 }).toArray()
  return Response.json(
    docs.map((d) => ({ id: d._id, data: d.data, updatedAt: d.updatedAt }))
  )
}

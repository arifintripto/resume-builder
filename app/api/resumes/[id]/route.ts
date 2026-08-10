import { auth } from '@/auth'
import clientPromise, { DB_NAME } from '@/lib/mongo'

type Ctx = { params: Promise<{ id: string }> }

async function requireUser() {
  const session = await auth()
  return (session?.user as { id?: string } | undefined)?.id ?? null
}

export async function PUT(req: Request, ctx: Ctx) {
  const userId = await requireUser()
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body?.data || !Array.isArray(body.data.sections))
    return Response.json({ error: 'invalid resume' }, { status: 400 })

  const col = (await clientPromise).db(DB_NAME).collection('resumes')
  try {
    await col.updateOne(
      // userId in the filter means another user's doc with this id can never match
      { _id: id as never, userId },
      {
        $set: { data: body.data, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )
  } catch {
    // duplicate _id owned by someone else
    return Response.json({ error: 'conflict' }, { status: 409 })
  }
  return Response.json({ ok: true })
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await requireUser()
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const col = (await clientPromise).db(DB_NAME).collection('resumes')
  await col.deleteOne({ _id: id as never, userId })
  return Response.json({ ok: true })
}

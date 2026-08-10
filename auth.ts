import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import clientPromise, { DB_NAME } from '@/lib/mongo'

export const authEnabled = !!(
  process.env.AUTH_SECRET &&
  process.env.AUTH_GOOGLE_ID &&
  process.env.AUTH_GOOGLE_SECRET &&
  process.env.MONGODB_URI
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, { databaseName: DB_NAME }),
  providers: [Google],
  callbacks: {
    session({ session, user }) {
      ;(session.user as { id?: string }).id = user.id
      return session
    },
  },
})

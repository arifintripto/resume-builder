import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI

declare global {
  var _mongoCache: { uri: string; promise: Promise<MongoClient> } | undefined
}

let clientPromise: Promise<MongoClient>

if (!uri) {
  clientPromise = Promise.reject(new Error('MONGODB_URI is not set'))
  clientPromise.catch(() => {}) // avoid unhandled-rejection noise when auth is unconfigured
} else if (process.env.NODE_ENV === 'development') {
  // cache across HMR reloads so dev doesn't open a new connection per edit;
  // keyed by URI so an edited .env.local (e.g. new password) drops the stale client
  if (!global._mongoCache || global._mongoCache.uri !== uri) {
    global._mongoCache = { uri, promise: new MongoClient(uri).connect() }
  }
  clientPromise = global._mongoCache.promise
} else {
  clientPromise = new MongoClient(uri).connect()
}

export default clientPromise

export const DB_NAME = process.env.MONGODB_DB ?? 'resume-builder'

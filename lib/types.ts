export type Entry = {
  id: string
  title?: string
  level?: 'h3' | 'h4'
  meta?: string
  text?: string
  bullets: string[]
}

export type Section = {
  id: string
  title: string
  entries: Entry[]
}

export type Resume = {
  name: string
  tagline: string[]
  contacts: string[]
  photo: string | null
  accent?: string // heading color, default #1a1a1a
  fontScale?: number // percent, default 100
  sections: Section[]
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

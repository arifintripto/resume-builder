'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { uid, type Resume } from '@/lib/types'
import { johnDoeResume } from '@/lib/johndoe'
import ResumePreview from '@/components/ResumePreview'

const STORE_KEY = 'resume-builder:store'
const LEGACY_KEY = 'resume-builder:data'
const ZOOM_KEY = 'resume-builder:viewzoom'
const HISTORY_LIMIT = 50

type Slot = { id: string; data: Resume }
type Store = { activeId: string; items: Slot[] }
type History = { past: Resume[]; future: Resume[] }

const plain = (html: string) => html.replace(/<[^>]*>/g, '').trim()

type CloudState = 'idle' | 'loading' | 'saving' | 'synced' | 'error'

export default function Home() {
  const [store, setStore] = useState<Store | null>(null)
  const [viewZoom, setViewZoom] = useState(100)
  const [downloading, setDownloading] = useState(false)
  const [authEnabled, setAuthEnabled] = useState(false)
  const [cloud, setCloud] = useState<CloudState>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const historiesRef = useRef<Map<string, History>>(new Map())
  const undoRef = useRef<() => void>(() => {})
  const redoRef = useRef<() => void>(() => {})
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: session, status } = useSession()
  const signedIn = status === 'authenticated'

  useEffect(() => {
    try {
      const zoom = localStorage.getItem(ZOOM_KEY)
      if (zoom) setViewZoom(Number(zoom) || 100)
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        setStore(JSON.parse(raw) as Store)
        return
      }
      // migrate a pre-slots save if one exists
      const legacy = localStorage.getItem(LEGACY_KEY)
      const first: Resume = legacy ? JSON.parse(legacy) : johnDoeResume()
      const id = uid()
      setStore({ activeId: id, items: [{ id, data: first }] })
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      const id = uid()
      setStore({ activeId: id, items: [{ id, data: johnDoeResume() }] })
    }
  }, [])

  // localStorage stays the guest-mode store only; cloud data never overwrites it
  useEffect(() => {
    if (store && !signedIn) localStorage.setItem(STORE_KEY, JSON.stringify(store))
  }, [store, signedIn])

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c) => setAuthEnabled(!!c.authEnabled))
      .catch(() => {})
  }, [])

  // On sign-in: load slots from the server; offer to upload local ones if the
  // account is empty.
  useEffect(() => {
    if (!signedIn) {
      setCloud('idle')
      return
    }
    let cancelled = false
    ;(async () => {
      setCloud('loading')
      try {
        const res = await fetch('/api/resumes')
        if (!res.ok) throw new Error()
        const list: { id: string; data: Resume }[] = await res.json()
        if (cancelled) return
        if (list.length > 0) {
          setStore({
            activeId: list[0].id,
            items: list.map((x) => ({ id: x.id, data: x.data })),
          })
          setCloud('synced')
          return
        }
        // empty account — migrate local slots if the user wants
        const rawLocal = localStorage.getItem(STORE_KEY)
        let migrated: Store | null = null
        if (rawLocal) {
          try {
            const local = JSON.parse(rawLocal) as Store
            if (
              local.items?.length &&
              confirm('Your Google account has no resumes yet. Upload the resumes saved in this browser to your account?')
            )
              migrated = local
          } catch {}
        }
        const next: Store = migrated ?? {
          activeId: uid(),
          items: [],
        }
        if (!migrated) next.items = [{ id: next.activeId, data: johnDoeResume() }]
        await Promise.all(
          next.items.map((i) =>
            fetch(`/api/resumes/${i.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: i.data }),
            })
          )
        )
        if (!cancelled) {
          setStore(next)
          setCloud('synced')
        }
      } catch {
        if (!cancelled) setCloud('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [signedIn])

  // Debounced cloud autosave of the active resume
  useEffect(() => {
    if (!signedIn || !store) return
    const activeSlot =
      store.items.find((i) => i.id === store.activeId) ?? store.items[0]
    if (!activeSlot) return
    setCloud('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/resumes/${activeSlot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: activeSlot.data }),
        })
        setCloud(res.ok ? 'synced' : 'error')
      } catch {
        setCloud('error')
      }
    }, 1500)
  }, [store, signedIn])

  useEffect(() => {
    localStorage.setItem(ZOOM_KEY, String(viewZoom))
  }, [viewZoom])

  // Ctrl/Cmd+Z / Shift+Z / Y — but not while typing, where the browser's own
  // text undo should win.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        t?.isContentEditable ||
        t?.tagName === 'INPUT' ||
        t?.tagName === 'TEXTAREA' ||
        t?.tagName === 'SELECT'
      )
        return
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redoRef.current()
        else undoRef.current()
      } else if (key === 'y') {
        e.preventDefault()
        redoRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!store) return null

  const active =
    store.items.find((i) => i.id === store.activeId) ?? store.items[0]
  const resume = active.data

  const history = (() => {
    let h = historiesRef.current.get(active.id)
    if (!h) {
      h = { past: [], future: [] }
      historiesRef.current.set(active.id, h)
    }
    return h
  })()

  const writeResume = (r: Resume) =>
    setStore({
      ...store,
      items: store.items.map((i) =>
        i.id === active.id ? { ...i, data: r } : i
      ),
    })

  const setResume = (r: Resume) => {
    history.past.push(resume)
    if (history.past.length > HISTORY_LIMIT) history.past.shift()
    history.future = []
    writeResume(r)
  }

  const undo = () => {
    const prev = history.past.pop()
    if (!prev) return
    history.future.push(resume)
    writeResume(prev)
  }

  const redo = () => {
    const next = history.future.pop()
    if (!next) return
    history.past.push(resume)
    writeResume(next)
  }

  undoRef.current = undo
  redoRef.current = redo

  const newSlot = () => {
    const id = uid()
    setStore({
      activeId: id,
      items: [...store.items, { id, data: johnDoeResume() }],
    })
  }

  const deleteSlot = () => {
    if (store.items.length === 1) return
    if (!confirm(`Delete resume "${plain(resume.name) || 'Untitled'}"?`)) return
    historiesRef.current.delete(active.id)
    if (signedIn) fetch(`/api/resumes/${active.id}`, { method: 'DELETE' }).catch(() => {})
    const items = store.items.filter((i) => i.id !== active.id)
    setStore({ activeId: items[0].id, items })
  }

  const reset = () => {
    if (confirm("Discard this resume's content and reset it to the John Doe template?"))
      setResume(johnDoeResume())
  }

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resume),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${plain(resume.name) || 'Resume'}.pdf`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      alert(`PDF export failed. ${err instanceof Error ? err.message : err}`)
    } finally {
      setDownloading(false)
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(resume, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${plain(resume.name) || 'resume'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = (file: File) => {
    file
      .text()
      .then((t) => {
        const parsed = JSON.parse(t) as Resume
        if (!parsed || !Array.isArray(parsed.sections)) throw new Error('bad shape')
        if (confirm(`Replace "${plain(resume.name) || 'Untitled'}" with the imported resume?`))
          setResume(parsed)
      })
      .catch(() => alert('That file is not a valid resume JSON export.'))
  }

  return (
    <main>
      <div className="toolbar no-print">
        <strong>Resume Builder</strong>
        <select
          value={active.id}
          onChange={(e) => setStore({ ...store, activeId: e.target.value })}
          title="Switch resume"
        >
          {store.items.map((i) => (
            <option key={i.id} value={i.id}>
              {plain(i.data.name) || 'Untitled'}
            </option>
          ))}
        </select>
        <button onClick={newSlot} title="Create a new resume">
          + New
        </button>
        <button
          onClick={deleteSlot}
          disabled={store.items.length === 1}
          title="Delete this resume"
        >
          Delete
        </button>
        <button onClick={undo} disabled={history.past.length === 0} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button onClick={redo} disabled={history.future.length === 0} title="Redo (Ctrl+Shift+Z)">
          ↷ Redo
        </button>
        <span className="spacer" />
        <label className="ctl-label" title="Heading color">
          Accent
          <input
            type="color"
            value={resume.accent ?? '#1a1a1a'}
            onChange={(e) => setResume({ ...resume, accent: e.target.value })}
          />
        </label>
        <label className="ctl-label" title="Scale the resume's text to fit more (or less) per page">
          Text
          <input
            type="range"
            min={85}
            max={110}
            step={5}
            value={resume.fontScale ?? 100}
            onChange={(e) =>
              setResume({ ...resume, fontScale: Number(e.target.value) })
            }
          />
          <span className="pct">{resume.fontScale ?? 100}%</span>
        </label>
        <label className="ctl-label" title="Zoom the preview — does not affect the PDF">
          Zoom
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={viewZoom}
            onChange={(e) => setViewZoom(Number(e.target.value))}
          />
          <span className="pct">{viewZoom}%</span>
        </label>
        <button onClick={reset}>Reset</button>
        <button onClick={exportJson}>Export JSON</button>
        <button onClick={() => fileRef.current?.click()}>Import JSON</button>
        <button onClick={() => window.print()}>Print</button>
        <button className="primary" onClick={downloadPdf} disabled={downloading}>
          {downloading ? 'Rendering…' : 'Download PDF'}
        </button>
        {authEnabled &&
          (signedIn ? (
            <span className="auth-box" title={session?.user?.email ?? ''}>
              {session?.user?.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="avatar" />
              )}
              <span className="cloud-state">
                {cloud === 'saving' && 'Saving…'}
                {cloud === 'synced' && 'Saved ✓'}
                {cloud === 'loading' && 'Loading…'}
                {cloud === 'error' && 'Sync error'}
              </span>
              <button onClick={() => signOut()}>Sign out</button>
            </span>
          ) : (
            <button onClick={() => signIn('google')}>Sign in with Google</button>
          ))}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importJson(f)
            e.target.value = ''
          }}
        />
      </div>
      <div
        className="view-zoom"
        style={{ zoom: viewZoom / 100 } as React.CSSProperties}
      >
        <ResumePreview resume={resume} onChange={setResume} />
      </div>
    </main>
  )
}

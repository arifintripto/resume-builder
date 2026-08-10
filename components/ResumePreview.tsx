'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { uid, type Entry, type Resume, type Section } from '@/lib/types'
import Editable from './Editable'

type Mutate = (fn: (draft: Resume) => void) => void

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '')

// A4 content height per page: 11.69in minus 0.5in top+bottom margins, in CSS px
const PAGE_CONTENT_PX = 1026.5
const MARGIN_PX = 48 // 0.5in
const GAP_PX = 28 // gray band between simulated sheets
// distance from one page's content start to the next page's content start
const PAGE_STEP_PX = PAGE_CONTENT_PX + 2 * MARGIN_PX + GAP_PX // 1150.5
const HEADING_KEEP_PX = 30 // a heading needs this much room after it, else it moves too

export default function ResumePreview({
  resume,
  onChange,
}: {
  resume: Resume
  onChange: (r: Resume) => void
}) {
  const photoRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState(1)

  // Word-style pagination: measure each block and push any that would straddle
  // a page boundary onto the next page via a screen-only --push margin.
  const paginate = () => {
    const content = contentRef.current
    const pageEl = content?.parentElement
    if (!content || !pageEl) return
    const zoom = (resume.fontScale ?? 100) / 100
    // ancestor view-zoom scales all rects; normalize back to the sheet's CSS px
    const pageRect = pageEl.getBoundingClientRect()
    const vz = pageRect.width / pageEl.offsetWidth || 1
    const isHeading = (el: HTMLElement) =>
      el.classList.contains('r-h2row') || el.classList.contains('r-entryrow')
    const blocks = Array.from(
      content.querySelectorAll<HTMLElement>('.r-h2row, .r-entryrow, .r-li, .r-p')
    )
    blocks.forEach((b) => b.style.removeProperty('--push'))

    const base = pageRect.top
    let page = 1
    let pageEnd = MARGIN_PX + PAGE_CONTENT_PX
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]
      const r = b.getBoundingClientRect()
      const top = (r.top - base) / vz
      const bottom = (r.bottom - base) / vz
      const limit = isHeading(b) ? pageEnd - HEADING_KEEP_PX : pageEnd
      if (bottom <= limit) continue
      if (r.height / vz > PAGE_CONTENT_PX) {
        // block taller than a page: let it straddle
        while (bottom > pageEnd) pageEnd += PAGE_STEP_PX, page++
        continue
      }
      // keep a heading attached to the block that follows it
      let target = b
      if (!isHeading(b) && i > 0) {
        const prev = blocks[i - 1]
        const prevBottom = (prev.getBoundingClientRect().bottom - base) / vz
        if (isHeading(prev) && top - prevBottom < 24 && !prev.style.getPropertyValue('--push'))
          target = prev
      }
      const targetTop = (target.getBoundingClientRect().top - base) / vz
      const push = (pageEnd + 2 * MARGIN_PX + GAP_PX - targetTop) / zoom
      target.style.setProperty('--push', `${push}px`)
      page++
      pageEnd += PAGE_STEP_PX
    }
    setPages(page)
  }

  const paginateRef = useRef(paginate)
  paginateRef.current = paginate

  useLayoutEffect(() => {
    paginateRef.current()
  }, [resume])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    // re-run when async layout changes land (web font, photo load)
    const ro = new ResizeObserver(() => paginateRef.current())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  const mutate: Mutate = (fn) => {
    const draft: Resume = JSON.parse(JSON.stringify(resume))
    fn(draft)
    onChange(draft)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = resume.sections.findIndex((s) => s.id === active.id)
    const to = resume.sections.findIndex((s) => s.id === over.id)
    if (from < 0 || to < 0) return
    onChange({ ...resume, sections: arrayMove(resume.sections, from, to) })
  }

  const uploadPhoto = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => mutate((d) => void (d.photo = String(reader.result)))
    reader.readAsDataURL(file)
  }

  return (
    <div
      className="page"
      style={
        {
          '--pages': pages,
          '--accent': resume.accent ?? '#1a1a1a',
        } as React.CSSProperties
      }
    >
      <div
        ref={contentRef}
        style={{ zoom: (resume.fontScale ?? 100) / 100 } as React.CSSProperties}
      >
      <div className="r-header">
        <div className="r-idgroup">
          {resume.photo ? (
            <div className="r-photobox">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resume.photo}
                alt=""
                className="r-photo"
                title="Click to replace photo"
                onClick={() => photoRef.current?.click()}
              />
              <button
                className="photo-x no-print"
                title="Remove photo"
                onClick={() => mutate((d) => void (d.photo = null))}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              className="r-photo-placeholder no-print"
              onClick={() => photoRef.current?.click()}
            >
              + Photo
            </button>
          )}
          <div>
            <Editable
              as="h1"
              className="r-name"
              value={resume.name}
              placeholder="Your name"
              onChange={(v) => mutate((d) => void (d.name = v))}
            />
            <div className="r-tagline">
              {resume.tagline.map((line, i) => (
                <div key={i} className="r-tagline-line hoverable">
                  <Editable
                    value={line}
                    placeholder="Tagline"
                    onChange={(v) => mutate((d) => void (d.tagline[i] = v))}
                  />
                  <span className="ctl ctl-side no-print">
                    <button
                      title="Add line below"
                      onClick={() =>
                        mutate((d) => d.tagline.splice(i + 1, 0, 'New line'))
                      }
                    >
                      +
                    </button>
                    <button
                      title="Remove line"
                      disabled={resume.tagline.length === 1}
                      onClick={() => mutate((d) => d.tagline.splice(i, 1))}
                    >
                      ×
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="r-contact">
          {resume.contacts.map((line, i) => (
            <div key={i} className="r-contact-line hoverable">
              <Editable
                value={line}
                placeholder="Contact line"
                onChange={(v) => mutate((d) => void (d.contacts[i] = v))}
              />
              <span className="ctl ctl-side-left no-print">
                <button
                  title="Add line below"
                  onClick={() =>
                    mutate((d) => d.contacts.splice(i + 1, 0, 'New line'))
                  }
                >
                  +
                </button>
                <button
                  title="Remove line"
                  disabled={resume.contacts.length === 1}
                  onClick={() => mutate((d) => d.contacts.splice(i, 1))}
                >
                  ×
                </button>
              </span>
            </div>
          ))}
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadPhoto(f)
            e.target.value = ''
          }}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={resume.sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {resume.sections.map((section, si) => (
            <SortableSection
              key={section.id}
              section={section}
              si={si}
              mutate={mutate}
            />
          ))}
        </SortableContext>
      </DndContext>
      </div>

      {Array.from({ length: pages - 1 }, (_, i) => (
        <div
          key={i}
          className="sheet-gap no-print"
          style={{
            top: 2 * MARGIN_PX + (i + 1) * PAGE_CONTENT_PX + i * (2 * MARGIN_PX + GAP_PX),
          }}
        >
          <span>Page {i + 2}</span>
        </div>
      ))}

      <button
        className="add-section no-print"
        onClick={() =>
          mutate((d) =>
            d.sections.push({
              id: uid(),
              title: 'New Section',
              entries: [{ id: uid(), title: 'New item', bullets: ['New point'] }],
            })
          )
        }
      >
        + Add section
      </button>
    </div>
  )
}

function SortableSection({
  section,
  si,
  mutate,
}: {
  section: Section
  si: number
  mutate: Mutate
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : undefined,
        position: 'relative',
      }}
    >
      <div className="r-h2row hoverable">
        <span
          className="grip no-print"
          title="Drag to reorder section"
          {...attributes}
          {...listeners}
        >
          ⠿
        </span>
        <Editable
          as="h2"
          className="r-h2"
          value={section.title}
          placeholder="Section title"
          onChange={(v) => mutate((d) => void (d.sections[si].title = v))}
        />
        <div className="r-rule" />
        <span className="ctl ctl-inrow no-print">
          <button
            title="Add an entry (title + date + bullets)"
            onClick={() =>
              mutate((d) =>
                d.sections[si].entries.push({
                  id: uid(),
                  title: 'New item',
                  meta: '',
                  bullets: ['New point'],
                })
              )
            }
          >
            + entry
          </button>
          <button
            title="Add a text paragraph"
            onClick={() =>
              mutate((d) =>
                d.sections[si].entries.push({
                  id: uid(),
                  text: 'New paragraph',
                  bullets: [],
                })
              )
            }
          >
            + text
          </button>
          <button
            title="Delete section"
            onClick={() => {
              if (confirm(`Delete section "${stripHtml(section.title)}"?`))
                mutate((d) => void d.sections.splice(si, 1))
            }}
          >
            ×
          </button>
        </span>
      </div>
      {section.entries.map((entry, ei) => (
        <EntryView
          key={entry.id}
          entry={entry}
          si={si}
          ei={ei}
          count={section.entries.length}
          mutate={mutate}
        />
      ))}
    </section>
  )
}

function EntryView({
  entry,
  si,
  ei,
  count,
  mutate,
}: {
  entry: Entry
  si: number
  ei: number
  count: number
  mutate: Mutate
}) {
  const patch = (fn: (e: Entry) => void) =>
    mutate((d) => fn(d.sections[si].entries[ei]))

  const controls = (
    <span className="ctl no-print">
      <button
        title="Add bullet point"
        onClick={() => patch((e) => e.bullets.push('New point'))}
      >
        + point
      </button>
      {entry.text === undefined && entry.title !== undefined && (
        <button
          title="Toggle heading size"
          onClick={() =>
            patch((e) => void (e.level = e.level === 'h4' ? 'h3' : 'h4'))
          }
        >
          {entry.level === 'h4' ? 'h4' : 'h3'}
        </button>
      )}
      <button
        title="Move up"
        disabled={ei === 0}
        onClick={() =>
          mutate((d) => {
            const a = d.sections[si].entries
            ;[a[ei - 1], a[ei]] = [a[ei], a[ei - 1]]
          })
        }
      >
        ↑
      </button>
      <button
        title="Move down"
        disabled={ei === count - 1}
        onClick={() =>
          mutate((d) => {
            const a = d.sections[si].entries
            ;[a[ei + 1], a[ei]] = [a[ei], a[ei + 1]]
          })
        }
      >
        ↓
      </button>
      <button
        title="Delete entry"
        onClick={() => mutate((d) => void d.sections[si].entries.splice(ei, 1))}
      >
        ×
      </button>
    </span>
  )

  return (
    <div className="r-entry">
      {entry.text !== undefined ? (
        <div className="hoverable" style={{ position: 'relative' }}>
          <Editable
            as="p"
            className="r-p"
            value={entry.text}
            multiline
            placeholder="Paragraph text"
            onChange={(v) => patch((e) => void (e.text = v))}
          />
          {controls}
        </div>
      ) : entry.title !== undefined ? (
        <div className="r-entryrow hoverable">
          <Editable
            as={entry.level === 'h4' ? 'h4' : 'h3'}
            className={entry.level === 'h4' ? 'r-h4' : 'r-h3'}
            value={entry.title}
            placeholder="Title"
            onChange={(v) => patch((e) => void (e.title = v))}
          />
          <Editable
            as="div"
            className={entry.level === 'h4' ? 'r-meta r-meta-sm' : 'r-meta'}
            value={entry.meta ?? ''}
            placeholder="Place, date"
            onChange={(v) => patch((e) => void (e.meta = v))}
          />
          {controls}
        </div>
      ) : (
        <div className="hoverable" style={{ position: 'relative', minHeight: 8 }}>
          {entry.bullets.length === 0 && (
            <span className="empty-hint no-print">
              empty entry — hover for controls
            </span>
          )}
          {controls}
        </div>
      )}
      {entry.bullets.length > 0 && (
        <ul className="r-ul">
          {entry.bullets.map((b, bi) => (
            <li key={bi} className="r-li hoverable">
              <Editable
                value={b}
                placeholder="Point"
                onChange={(v) => patch((e) => void (e.bullets[bi] = v))}
              />
              <span className="ctl no-print">
                <button
                  title="Add point below"
                  onClick={() => patch((e) => e.bullets.splice(bi + 1, 0, 'New point'))}
                >
                  +
                </button>
                <button
                  title="Move up"
                  disabled={bi === 0}
                  onClick={() =>
                    patch((e) => {
                      ;[e.bullets[bi - 1], e.bullets[bi]] = [e.bullets[bi], e.bullets[bi - 1]]
                    })
                  }
                >
                  ↑
                </button>
                <button
                  title="Move down"
                  disabled={bi === entry.bullets.length - 1}
                  onClick={() =>
                    patch((e) => {
                      ;[e.bullets[bi + 1], e.bullets[bi]] = [e.bullets[bi], e.bullets[bi + 1]]
                    })
                  }
                >
                  ↓
                </button>
                <button
                  title="Delete point"
                  onClick={() => patch((e) => e.bullets.splice(bi, 1))}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

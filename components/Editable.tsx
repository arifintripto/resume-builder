'use client'

import { useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4'
  className?: string
  placeholder?: string
  multiline?: boolean
}

export default function Editable({
  value,
  onChange,
  as: Tag = 'span',
  className,
  placeholder,
  multiline = false,
}: Props) {
  const ref = useRef<HTMLElement | null>(null)

  // Sync external value into the DOM without clobbering the caret mid-edit:
  // contentEditable owns its content while focused; we only write when it differs.
  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value && document.activeElement !== el) {
      el.innerHTML = value
    }
  }, [value])

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={className}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const html = e.currentTarget.innerHTML
        if (html !== value) onChange(html)
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        }
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, text)
      }}
    />
  )
}

import { Children, useMemo, type ReactNode } from 'react'
import Markdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Element } from 'hast'
import styles from './PreviewPanel.module.css'

export interface PreviewSelection {
  startLine: number
  endLine: number
  text: string
}

function sourceAttributes(node?: Element, selection?: PreviewSelection) {
  const start = node?.position?.start.line
  const end = node?.position?.end.line

  if (!start || !end) return {}

  const isActive = Boolean(selection && selection.startLine >= start && selection.startLine <= end)
  const hasSelection = Boolean(selection?.text && selection.endLine >= start && selection.startLine <= end)

  return {
    'data-block-id': `${node.tagName}-${start}-${end}`,
    'data-source-start': start,
    'data-source-end': end,
    ...(isActive ? { 'data-sync-active': 'true' } : {}),
    ...(hasSelection ? { 'data-selection-active': 'true', 'data-selected-text': selection?.text } : {}),
  }
}

function renderHeadingChildren(children: ReactNode, fallbackNumber: string, numbered: boolean) {
  if (!numbered) return children
  const parts = Children.toArray(children)
  const first = parts[0]
  if (typeof first !== 'string') {
    return <><span className={styles.headingNumber} data-highlight-ignore>{fallbackNumber}</span>{children}</>
  }

  const match = first.match(/^(\d+(?:\.\d+)*)[.、]?\s+/)
  const number = match?.[1] ?? fallbackNumber
  const content = match ? first.slice(match[0].length) : first

  return <><span className={styles.headingNumber} data-highlight-ignore>{number}</span>{content}{parts.slice(1)}</>
}

function headingCountersAtLine(markdown: string, targetLine: number) {
  let h1 = 0
  let h2 = 0
  let h3 = 0
  let fence: string | undefined
  markdown.split('\n').slice(0, targetLine).forEach((line) => {
    const fenceMatch = new RegExp('^\\s*([\\x60~]{3,})').exec(line)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      fence = fence === marker ? undefined : fence ?? marker
      return
    }
    if (fence) return
    const match = /^(#{1,3})\s+/.exec(line)
    if (match?.[1].length === 1) {
      h1 += 1
      h2 = 0
      h3 = 0
    } else if (match?.[1].length === 2) {
      h2 += 1
      h3 = 0
    } else if (match?.[1].length === 3) {
      h3 += 1
    }
  })
  return { h1: Math.max(h1, 1), h2: Math.max(h2, 1), h3: Math.max(h3, 1) }
}

function createComponents(markdown: string, selection: PreviewSelection | undefined, numbering: NonNullable<MarkdownRendererProps['numbering']>): Components {
  return {
    h1: ({ node, children, ...props }) => {
      const counters = headingCountersAtLine(markdown, node?.position?.start.line ?? 1)
      return <h1 {...props} {...sourceAttributes(node, selection)}>{renderHeadingChildren(children, String(counters.h1), numbering.h1)}</h1>
    },
    h2: ({ node, children, ...props }) => {
      const counters = headingCountersAtLine(markdown, node?.position?.start.line ?? 1)
      return <h2 {...props} {...sourceAttributes(node, selection)}>{renderHeadingChildren(children, String(counters.h2), numbering.h2)}</h2>
    },
    h3: ({ node, children, ...props }) => {
      const counters = headingCountersAtLine(markdown, node?.position?.start.line ?? 1)
      return <h3 {...props} {...sourceAttributes(node, selection)}>{renderHeadingChildren(children, [counters.h2, counters.h3].join('.'), numbering.h3)}</h3>
    },
    p: ({ node, children, ...props }) => <p {...props} {...sourceAttributes(node, selection)}>{children}</p>,
    blockquote: ({ node, children, ...props }) => <blockquote {...props} {...sourceAttributes(node, selection)}>{children}</blockquote>,
    ul: ({ node, children, ...props }) => <ul {...props} {...sourceAttributes(node, selection)}>{children}</ul>,
    ol: ({ node, children, ...props }) => <ol {...props} {...sourceAttributes(node, selection)}>{children}</ol>,
    pre: ({ node, children, ...props }) => <pre {...props} {...sourceAttributes(node, selection)}>{children}</pre>,
    table: ({ node, children, ...props }) => <div className={styles.tableWrap} {...sourceAttributes(node, selection)}><table {...props}>{children}</table></div>,
    hr: ({ node, ...props }) => <hr {...props} {...sourceAttributes(node, selection)} />,
    img: ({ node, alt, ...props }) => {
      const source = !props.src || props.src.startsWith('asset://') ? undefined : props.src
      return (
        <span className={styles.imageFrame} {...sourceAttributes(node, selection)}>
          <img {...props} src={source} alt={alt ?? ''} loading="lazy" />
          {alt ? <small aria-hidden="true">{alt}</small> : null}
        </span>
      )
    },
    a: ({ node: _node, children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a>,
  }
}

export interface MarkdownRendererProps {
  markdown: string
  selection?: PreviewSelection
  numbering?: { h1: boolean; h2: boolean; h3: boolean }
}

function previewUrlTransform(url: string) {
  if (url.startsWith('blob:') || url.startsWith('asset://')) return url
  return defaultUrlTransform(url)
}

export function MarkdownRenderer({ markdown, selection, numbering = { h1: false, h2: true, h3: false } }: MarkdownRendererProps) {
  const components = useMemo(() => createComponents(markdown, selection, numbering), [
    markdown,
    numbering.h1,
    numbering.h2,
    numbering.h3,
    selection?.endLine,
    selection?.startLine,
    selection?.text,
  ])
  if (!markdown.trim()) return <p className={styles.empty}>开始输入 Markdown，预览会实时显示在这里。</p>

  return <Markdown remarkPlugins={[remarkGfm]} components={components} urlTransform={previewUrlTransform} skipHtml>{markdown}</Markdown>
}

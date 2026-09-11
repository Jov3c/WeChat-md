import { Children, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
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

function renderH2Children(children: ReactNode) {
  const parts = Children.toArray(children)
  const first = parts[0]
  if (typeof first !== 'string') return children

  const match = first.match(/^(\d+)[.、]?\s+/)
  if (!match) return children

  return <><span>{match[1]}</span>{first.slice(match[0].length)}{parts.slice(1)}</>
}

function createComponents(selection?: PreviewSelection): Components {
  return {
    h1: ({ node, children, ...props }) => <h1 {...props} {...sourceAttributes(node, selection)}>{children}</h1>,
    h2: ({ node, children, ...props }) => <h2 {...props} {...sourceAttributes(node, selection)}>{renderH2Children(children)}</h2>,
    h3: ({ node, children, ...props }) => <h3 {...props} {...sourceAttributes(node, selection)}>{children}</h3>,
    p: ({ node, children, ...props }) => <p {...props} {...sourceAttributes(node, selection)}>{children}</p>,
    blockquote: ({ node, children, ...props }) => <blockquote {...props} {...sourceAttributes(node, selection)}>{children}</blockquote>,
    ul: ({ node, children, ...props }) => <ul {...props} {...sourceAttributes(node, selection)}>{children}</ul>,
    ol: ({ node, children, ...props }) => <ol {...props} {...sourceAttributes(node, selection)}>{children}</ol>,
    pre: ({ node, children, ...props }) => <pre {...props} {...sourceAttributes(node, selection)}>{children}</pre>,
    table: ({ node, children, ...props }) => <div className={styles.tableWrap} {...sourceAttributes(node, selection)}><table {...props}>{children}</table></div>,
    hr: ({ node, ...props }) => <hr {...props} {...sourceAttributes(node, selection)} />,
    img: ({ node, alt, ...props }) => <img {...props} alt={alt ?? ''} loading="lazy" {...sourceAttributes(node, selection)} />,
    a: ({ node: _node, children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a>,
  }
}

export interface MarkdownRendererProps {
  markdown: string
  selection?: PreviewSelection
}

export function MarkdownRenderer({ markdown, selection }: MarkdownRendererProps) {
  if (!markdown.trim()) return <p className={styles.empty}>开始输入 Markdown，预览会实时显示在这里。</p>

  return <Markdown remarkPlugins={[remarkGfm]} components={createComponents(selection)} skipHtml>{markdown}</Markdown>
}

import { Children, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Element } from 'hast'
import styles from './PreviewPanel.module.css'

function sourceAttributes(node?: Element) {
  const start = node?.position?.start.line
  const end = node?.position?.end.line

  if (!start || !end) return {}

  return {
    'data-block-id': `${node.tagName}-${start}-${end}`,
    'data-source-start': start,
    'data-source-end': end,
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

const components: Components = {
  h1: ({ node, children, ...props }) => <h1 {...props} {...sourceAttributes(node)}>{children}</h1>,
  h2: ({ node, children, ...props }) => <h2 {...props} {...sourceAttributes(node)}>{renderH2Children(children)}</h2>,
  h3: ({ node, children, ...props }) => <h3 {...props} {...sourceAttributes(node)}>{children}</h3>,
  p: ({ node, children, ...props }) => <p {...props} {...sourceAttributes(node)}>{children}</p>,
  blockquote: ({ node, children, ...props }) => <blockquote {...props} {...sourceAttributes(node)}>{children}</blockquote>,
  ul: ({ node, children, ...props }) => <ul {...props} {...sourceAttributes(node)}>{children}</ul>,
  ol: ({ node, children, ...props }) => <ol {...props} {...sourceAttributes(node)}>{children}</ol>,
  pre: ({ node, children, ...props }) => <pre {...props} {...sourceAttributes(node)}>{children}</pre>,
  table: ({ node, children, ...props }) => <div className={styles.tableWrap} {...sourceAttributes(node)}><table {...props}>{children}</table></div>,
  hr: ({ node, ...props }) => <hr {...props} {...sourceAttributes(node)} />,
  img: ({ node, alt, ...props }) => <img {...props} alt={alt ?? ''} loading="lazy" {...sourceAttributes(node)} />,
  a: ({ node: _node, children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a>,
}

export interface MarkdownRendererProps {
  markdown: string
}

export function MarkdownRenderer({ markdown }: MarkdownRendererProps) {
  if (!markdown.trim()) return <p className={styles.empty}>开始输入 Markdown，预览会实时显示在这里。</p>

  return <Markdown remarkPlugins={[remarkGfm]} components={components} skipHtml>{markdown}</Markdown>
}

import type { StylePreset } from '../styles/stylePresets'

export type ArticleVersionReason = 'automatic' | 'manual' | 'safety' | 'restore'

export interface ArticleVersion {
  id: string
  articleId: string
  title: string
  content: string
  styleId?: string
  createdAt: string
  reason: ArticleVersionReason
  styleSnapshot?: StylePreset
}

export interface VersionableArticleState {
  title: string
  content: string
  styleId?: string
  styleSnapshot?: StylePreset
}

export const AUTOMATIC_VERSION_INTERVAL_MS = 10 * 60 * 1000

export function shouldCreateAutomaticVersion(
  previous: ArticleVersion | undefined,
  current: VersionableArticleState,
  now = new Date().toISOString(),
) {
  if (!previous) return false
  const unchanged = previous.title === current.title
    && previous.content === current.content
    && previous.styleId === current.styleId
    && JSON.stringify(previous.styleSnapshot) === JSON.stringify(current.styleSnapshot)
  if (unchanged) return false
  return Date.parse(now) - Date.parse(previous.createdAt) >= AUTOMATIC_VERSION_INTERVAL_MS
}

export function createArticleVersion(
  articleId: string,
  article: VersionableArticleState,
  reason: ArticleVersionReason,
  { id = crypto.randomUUID(), createdAt = new Date().toISOString() }: { id?: string; createdAt?: string } = {},
): ArticleVersion {
  return { id, articleId, title: article.title, content: article.content, styleId: article.styleId, styleSnapshot: article.styleSnapshot, createdAt, reason }
}

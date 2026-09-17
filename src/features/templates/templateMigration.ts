import type { ArticleLibrarySnapshot, StoredArticle } from '../articles/articleRepository'
import { isArticleLayoutId, type ArticleLayoutId } from '../layouts/articleLayouts'
import type { ArticleContentTemplate } from './templatePresets'

interface LegacyArticleTemplate {
  id: string
  name: string
  description?: string
  content?: string
  layout?: ArticleLayoutId
  layoutId?: ArticleLayoutId
  builtIn?: boolean
}

function legacyLayoutId(value: unknown): ArticleLayoutId {
  if (value === 'blank') return 'standard'
  return isArticleLayoutId(value) ? value : 'standard'
}

function migrateTemplate(template: LegacyArticleTemplate): ArticleContentTemplate {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? '自定义内容模板',
    content: template.content ?? '',
    layoutId: legacyLayoutId(template.layoutId ?? template.layout),
    builtIn: template.builtIn ?? false,
  }
}

function migrateArticle(
  article: StoredArticle,
  templatesById: Map<string, ArticleContentTemplate>,
): StoredArticle {
  const selectedTemplate = article.templateId ? templatesById.get(article.templateId) : undefined
  return {
    ...article,
    layoutId: article.layoutId ?? selectedTemplate?.layoutId ?? legacyLayoutId(article.templateId),
    contentTemplateId: article.contentTemplateId ?? selectedTemplate?.id,
  }
}

export function migrateLegacyTemplateData(snapshot: ArticleLibrarySnapshot): ArticleLibrarySnapshot {
  const migratedTemplates = (snapshot.templates ?? []).map((template) =>
    migrateTemplate(template as unknown as LegacyArticleTemplate),
  )
  const templatesById = new Map(migratedTemplates.map((template) => [template.id, template]))

  return {
    ...snapshot,
    articles: snapshot.articles.map((article) => migrateArticle(article, templatesById)),
    templates: migratedTemplates,
  }
}

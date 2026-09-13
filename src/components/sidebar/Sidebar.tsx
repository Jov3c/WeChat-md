import { useMemo, useState } from 'react'
import { Archive, Clock3, FileText, Inbox, MoreHorizontal, Search, Settings, Star, Trash2, UploadCloud } from 'lucide-react'
import type { ArticleItem } from '../../app/demoData'
import { DropdownMenu, IconButton, Input, ScrollArea } from '../ui'
import styles from './Sidebar.module.css'

export interface SidebarProps {
  articles: ArticleItem[]
  selectedId: string
  onSelect: (id: string) => void
  onRename: (article: ArticleItem) => void
  onDuplicate: (id: string) => void
  onToggleFavorite: (id: string) => void
  onMoveToTrash: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (article: ArticleItem) => void
  onTogglePublished: (id: string) => void
  onOpenSettings?: () => void
  onOpenHistory?: (id: string) => void
}

type ArticleCollection = 'all' | 'recent' | 'favorite' | 'wechat' | 'draft' | 'published' | 'trash'

const navItems = [
  { id: 'all', label: '全部文章', icon: Inbox },
  { id: 'recent', label: '最近修改', icon: Clock3 },
  { id: 'favorite', label: '收藏', icon: Star },
  { id: 'wechat', label: '公众号导入', icon: UploadCloud },
  { id: 'draft', label: '草稿', icon: FileText },
  { id: 'published', label: '已发布', icon: Archive },
  { id: 'trash', label: '回收站', icon: Trash2 },
] as const

function belongsToCollection(article: ArticleItem, collection: ArticleCollection) {
  if (collection === 'trash') return article.status === 'trash'
  if (article.status === 'trash') return false
  if (collection === 'all' || collection === 'recent') return true
  if (collection === 'favorite') return article.favorite === true
  if (collection === 'wechat') return article.source === 'wechat'
  if (collection === 'published') return article.status === 'published'
  return article.status === undefined || article.status === 'draft'
}

export function Sidebar({ articles, selectedId, onSelect, onRename, onDuplicate, onToggleFavorite, onMoveToTrash, onRestore, onDelete, onTogglePublished, onOpenSettings = () => undefined, onOpenHistory = () => undefined }: SidebarProps) {
  const [query, setQuery] = useState('')
  const [collection, setCollection] = useState<ArticleCollection>('all')
  const counts = useMemo(
    () => Object.fromEntries(navItems.map(({ id }) => [id, articles.filter((article) => belongsToCollection(article, id)).length])),
    [articles],
  ) as Record<ArticleCollection, number>
  const visibleArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return articles.filter((article) => (
      belongsToCollection(article, collection)
      && (!normalizedQuery || article.title.toLocaleLowerCase().includes(normalizedQuery))
    ))
  }, [articles, collection, query])

  return (
    <nav className={styles.sidebar} aria-label="文章导航">
      <div className={styles.search}>
        <Input
          aria-label="搜索文章"
          placeholder="搜索文章..."
          leadingIcon={<Search size={16} />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className={styles.navList}>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            className={styles.navItem}
            data-active={collection === id}
            type="button"
            key={id}
            aria-label={`${label} ${counts[id]}`}
            onClick={() => setCollection(id)}
          >
            <Icon size={17} /><span>{label}</span><span className={styles.count}>{counts[id]}</span>
          </button>
        ))}
      </div>
      <div className={styles.sectionLabel}>文章列表</div>
      <div className={styles.articleArea} role="region" aria-label="可滚动文章列表">
        <ScrollArea>
          <div className={styles.articleList}>
            {visibleArticles.map((article) => (
              <div className={styles.articleRow} data-selected={article.id === selectedId} key={article.id}>
                <button
                  type="button"
                  className={styles.article}
                  aria-current={article.id === selectedId ? 'page' : undefined}
                  aria-label={`${article.title}，${article.date}`}
                  onClick={() => onSelect(article.id)}
                >
                  <span className={styles.articleTitle}>
                    <span>{article.title}</span>
                    {article.favorite ? <Star aria-hidden="true" size={11} fill="currentColor" /> : null}
                  </span>
                  <span className={styles.articleDate}>{article.date} · {article.source === 'wechat' ? '公众号' : article.source === 'imported' ? '导入' : '本地'}</span>
                </button>
                <DropdownMenu
                  trigger={<IconButton className={styles.articleMenu} label={`管理 ${article.title}`}><MoreHorizontal size={15} /></IconButton>}
                  items={article.status === 'trash' ? [
                    { id: 'restore', label: '恢复文章', onSelect: () => onRestore(article.id) },
                    { id: 'delete', label: '永久删除', separatorBefore: true, onSelect: () => onDelete(article) },
                  ] : [
                    { id: 'favorite', label: article.favorite ? '取消收藏' : '收藏文章', onSelect: () => onToggleFavorite(article.id) },
                    { id: 'published', label: article.status === 'published' ? '移回草稿' : '标记为已发布', onSelect: () => onTogglePublished(article.id) },
                    { id: 'rename', label: '重命名', onSelect: () => onRename(article) },
                    { id: 'duplicate', label: '创建副本', onSelect: () => onDuplicate(article.id) },
                    { id: 'history', label: '版本历史', onSelect: () => onOpenHistory(article.id) },
                    { id: 'trash', label: '移入回收站', separatorBefore: true, onSelect: () => onMoveToTrash(article.id) },
                  ]}
                />
              </div>
            ))}
            {visibleArticles.length === 0 && <p className={styles.empty}>没有找到文章</p>}
          </div>
        </ScrollArea>
      </div>
      <button className={styles.settings} type="button" onClick={onOpenSettings}><Settings size={18} /> 设置</button>
    </nav>
  )
}

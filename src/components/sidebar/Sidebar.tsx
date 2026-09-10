import { Archive, Clock3, FileText, Inbox, Search, Settings, Star, Trash2, UploadCloud } from 'lucide-react'
import type { ArticleItem } from '../../app/demoData'
import { Input, ScrollArea } from '../ui'
import styles from './Sidebar.module.css'

export interface SidebarProps {
  articles: ArticleItem[]
  selectedId: string
  onSelect: (id: string) => void
}

const navItems = [
  { label: '全部文章', count: 24, icon: Inbox, active: true },
  { label: '最近修改', count: 8, icon: Clock3 },
  { label: '收藏', count: 5, icon: Star },
  { label: '公众号导入', count: 6, icon: UploadCloud },
  { label: '草稿', count: 12, icon: FileText },
  { label: '已发布', count: 3, icon: Archive },
  { label: '回收站', count: 1, icon: Trash2 },
]

export function Sidebar({ articles, selectedId, onSelect }: SidebarProps) {
  return (
    <nav className={styles.sidebar} aria-label="文章导航">
      <div className={styles.search}><Input aria-label="搜索文章" placeholder="搜索文章..." leadingIcon={<Search size={16} />} /></div>
      <div className={styles.navList}>
        {navItems.map(({ label, count, icon: Icon, active }) => (
          <button className={styles.navItem} data-active={active} type="button" key={label}>
            <Icon size={17} /><span>{label}</span><span className={styles.count}>{count}</span>
          </button>
        ))}
      </div>
      <div className={styles.sectionLabel}>文章列表</div>
      <div className={styles.articleArea}>
        <ScrollArea>
          <div className={styles.articleList}>
            {articles.map((article) => (
              <button
                type="button"
                className={styles.article}
                data-selected={article.id === selectedId}
                aria-current={article.id === selectedId ? 'page' : undefined}
                aria-label={`${article.title}，${article.date}`}
                key={article.id}
                onClick={() => onSelect(article.id)}
              >
                <span className={styles.articleTitle}>{article.title}</span>
                <span className={styles.articleDate}>{article.date}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
      <button className={styles.settings} type="button"><Settings size={18} /> 设置</button>
    </nav>
  )
}

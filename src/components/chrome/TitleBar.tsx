import { Maximize2, Minus, X } from 'lucide-react'
import styles from './AppChrome.module.css'

export function TitleBar() {
  return (
    <header className={styles.titleBar}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true" />
        <div className={styles.brandText}>
          <span className={styles.productName}>WeChat MD Editor</span>
          <span className={styles.tagline}>专注于更好的公众号写作体验</span>
        </div>
      </div>
      <div className={styles.windowControls} aria-label="窗口控制">
        <button className={styles.windowButton} type="button" aria-label="最小化窗口"><Minus size={14} /></button>
        <button className={styles.windowButton} type="button" aria-label="最大化窗口"><Maximize2 size={12} /></button>
        <button className={styles.windowButton} type="button" aria-label="关闭窗口"><X size={15} /></button>
      </div>
    </header>
  )
}

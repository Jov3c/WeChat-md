import styles from './AppChrome.module.css'

export function TitleBar() {
  return (
    <header className={styles.titleBar}>
      <div className={styles.brand}>
        <img className={styles.brandMark} src="/favicon.svg" alt="WeChat MD 品牌图标" />
        <div className={styles.brandText}>
          <span className={styles.productName}>WeChat MD Editor</span>
          <span className={styles.tagline}>专注于更好的公众号写作体验</span>
        </div>
      </div>
    </header>
  )
}

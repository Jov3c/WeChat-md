import { useEffect, useState, type ReactNode } from 'react'
import type { RuntimeServices } from './contracts'
import styles from './PlatformGate.module.css'

export interface PlatformGateProps {
  createServices: () => Promise<RuntimeServices>
  children: (services: RuntimeServices) => ReactNode
}

export function PlatformGate(_props: PlatformGateProps) {
  const { createServices, children } = _props
  const [attempt, setAttempt] = useState(0)
  const [services, setServices] = useState<RuntimeServices>()
  const [error, setError] = useState<{ message: string; databasePath?: string }>()

  useEffect(() => {
    let active = true
    setError(undefined)
    createServices().then((value) => {
      if (active) setServices(value)
    }).catch((reason: unknown) => {
      if (!active) return
      const value = reason as { message?: string; databasePath?: string }
      setError({ message: value.message ?? '桌面数据无法打开', databasePath: value.databasePath })
    })
    return () => { active = false }
  }, [attempt, createServices])

  if (services) return children(services)
  if (error) {
    return (
      <main className={styles.page}>
        <section className={styles.card} role="alert">
          <img src="/favicon.svg" alt="" className={styles.mark} />
          <h1>桌面数据无法打开</h1>
          <p>你的文章没有被修改。请确认文件未被其他程序占用，然后重试。</p>
          {error.databasePath ? <code>{error.databasePath}</code> : null}
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>重试</button>
        </section>
      </main>
    )
  }
  return <main className={styles.page}><p className={styles.loading}>正在打开桌面数据…</p></main>
}

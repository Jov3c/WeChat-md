import type { HTMLAttributes } from 'react'
import styles from './Controls.module.css'

export function Badge({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`${styles.badge} ${className}`.trim()} {...props} />
}

import type { HTMLAttributes } from 'react'
import styles from './Controls.module.css'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean
}

export function Card({ selected = false, className = '', ...props }: CardProps) {
  return <div className={`${styles.card} ${className}`.trim()} data-selected={selected} {...props} />
}

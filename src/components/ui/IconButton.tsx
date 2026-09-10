import { forwardRef, type ButtonHTMLAttributes } from 'react'
import styles from './Controls.module.css'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className = '', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={`${styles.iconButton} ${className}`.trim()}
      {...props}
    />
  ),
)

IconButton.displayName = 'IconButton'

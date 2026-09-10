import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './Controls.module.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leadingIcon, className = '', ...props }, ref) => (
    <span className={styles.inputWrap}>
      {leadingIcon ? <span className={styles.inputIcon}>{leadingIcon}</span> : null}
      <input
        ref={ref}
        className={`${styles.input} ${className}`.trim()}
        data-has-icon={Boolean(leadingIcon)}
        {...props}
      />
    </span>
  ),
)

Input.displayName = 'Input'

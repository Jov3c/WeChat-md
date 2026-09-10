import * as SwitchPrimitive from '@radix-ui/react-switch'
import styles from './Controls.module.css'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

export function Switch({ checked, onCheckedChange, label, disabled }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={styles.switch}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      disabled={disabled}
    >
      <SwitchPrimitive.Thumb className={styles.switchThumb} />
    </SwitchPrimitive.Root>
  )
}

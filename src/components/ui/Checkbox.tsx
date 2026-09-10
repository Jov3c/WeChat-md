import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import styles from './Controls.module.css'

export interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}

export function Checkbox({ checked, onCheckedChange, label }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={styles.checkbox}
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next === true)}
      aria-label={label}
    >
      <CheckboxPrimitive.Indicator><Check size={12} strokeWidth={3} /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

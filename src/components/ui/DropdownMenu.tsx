import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { ReactElement } from 'react'
import styles from './Overlays.module.css'

export interface DropdownItem {
  id: string
  label: string
  onSelect: () => void
}

export interface DropdownMenuProps {
  trigger: ReactElement
  items: DropdownItem[]
}

export function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content className={styles.menuContent} sideOffset={6} align="start">
          {items.map((item) => (
            <DropdownMenuPrimitive.Item
              key={item.id}
              className={styles.menuItem}
              onSelect={item.onSelect}
            >
              {item.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

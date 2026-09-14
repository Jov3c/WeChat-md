import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { ReactElement } from 'react'
import styles from './Overlays.module.css'

export interface DropdownItem {
  id: string
  label: string
  onSelect: () => void
  separatorBefore?: boolean
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
        <DropdownMenuPrimitive.Content
          className={styles.menuContent}
          sideOffset={6}
          align="start"
          style={{ maxHeight: 'calc(100vh - 24px)', overflowY: 'auto', overscrollBehavior: 'contain' }}
        >
          {items.map((item) => (
            <div className={item.separatorBefore ? styles.menuItemSeparated : undefined} key={item.id}>
            <DropdownMenuPrimitive.Item
              className={styles.menuItem}
              onSelect={item.onSelect}
            >
              {item.label}
            </DropdownMenuPrimitive.Item>
            </div>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

import * as TabsPrimitive from '@radix-ui/react-tabs'
import styles from './Controls.module.css'

export interface TabItem {
  value: string
  label: string
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onValueChange: (value: string) => void
  ariaLabel: string
}

export function Tabs({ items, value, onValueChange, ariaLabel }: TabsProps) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List className={styles.tabsList} aria-label={ariaLabel}>
        {items.map((item) => (
          <TabsPrimitive.Trigger className={styles.tab} key={item.value} value={item.value}>
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  )
}

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import type { ComponentPropsWithoutRef } from 'react'
import styles from './Overlays.module.css'

type ScrollAreaProps = ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>

export function ScrollArea({ children, className = '', ...props }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root className={`${styles.scrollRoot} ${className}`.trim()} {...props}>
      <ScrollAreaPrimitive.Viewport className={styles.scrollViewport}>{children}</ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar className={styles.scrollbar} orientation="vertical">
        <ScrollAreaPrimitive.Thumb className={styles.scrollThumb} />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  )
}

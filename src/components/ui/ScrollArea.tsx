import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react'
import styles from './Overlays.module.css'

type ScrollAreaProps = ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  viewportProps?: ComponentPropsWithRef<typeof ScrollAreaPrimitive.Viewport>
}

export function ScrollArea({ children, className = '', viewportProps, ...props }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root className={`${styles.scrollRoot} ${className}`.trim()} {...props}>
      <ScrollAreaPrimitive.Viewport {...viewportProps} className={`${styles.scrollViewport} ${viewportProps?.className ?? ''}`.trim()}>{children}</ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar className={styles.scrollbar} orientation="vertical">
        <ScrollAreaPrimitive.Thumb className={styles.scrollThumb} />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  )
}

import * as ToastPrimitive from '@radix-ui/react-toast'
import styles from './Overlays.module.css'

export interface ToastProps {
  open: boolean
  message: string
  onOpenChange: (open: boolean) => void
}

export function Toast({ open, message, onOpenChange }: ToastProps) {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <ToastPrimitive.Root
        className={styles.toast}
        open={open}
        onOpenChange={onOpenChange}
        duration={2400}
      >
        <ToastPrimitive.Description>{message}</ToastPrimitive.Description>
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className={styles.toastViewport} />
    </ToastPrimitive.Provider>
  )
}

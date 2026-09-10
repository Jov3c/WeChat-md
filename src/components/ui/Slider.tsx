import * as SliderPrimitive from '@radix-ui/react-slider'
import styles from './Controls.module.css'

export interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  label: string
  min: number
  max: number
  step?: number
}

export function Slider({ value, onValueChange, label, min, max, step = 1 }: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={styles.slider}
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
    >
      <SliderPrimitive.Track className={styles.sliderTrack}>
        <SliderPrimitive.Range className={styles.sliderRange} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={styles.sliderThumb} aria-label={label} />
    </SliderPrimitive.Root>
  )
}

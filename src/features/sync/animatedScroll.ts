interface AnimatedScrollOptions {
  read: () => number
  write: (value: number) => void
  requestFrame?: (callback: FrameRequestCallback) => number
  cancelFrame?: (id: number) => void
  prefersReducedMotion?: () => boolean
}

const duration = 160

function cubicBezierCoordinate(t: number, first: number, second: number) {
  const inverse = 1 - t
  return 3 * inverse * inverse * t * first + 3 * inverse * t * t * second + t * t * t
}

function easeInOut(progress: number) {
  if (progress === 0 || progress === 1) return progress
  let low = 0
  let high = 1
  let parameter = progress
  for (let index = 0; index < 12; index += 1) {
    parameter = (low + high) / 2
    const x = cubicBezierCoordinate(parameter, 0.77, 0.175)
    if (x < progress) low = parameter
    else high = parameter
  }
  return cubicBezierCoordinate(parameter, 0, 1)
}

export function createAnimatedScrollController(options: AnimatedScrollOptions) {
  const requestFrame = options.requestFrame ?? requestAnimationFrame
  const cancelFrame = options.cancelFrame ?? cancelAnimationFrame
  const prefersReducedMotion = options.prefersReducedMotion ?? (() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  let frame: number | undefined
  let following = false

  const cancel = () => {
    if (frame !== undefined) cancelFrame(frame)
    frame = undefined
    following = false
  }

  const releaseOnNextFrame = () => {
    frame = requestFrame(() => {
      frame = undefined
      following = false
    })
  }

  return {
    scrollTo(target: number) {
      cancel()
      following = true
      if (prefersReducedMotion()) {
        options.write(target)
        releaseOnNextFrame()
        return
      }

      const start = options.read()
      let startedAt: number | undefined
      const tick = (time: number) => {
        startedAt ??= time
        const progress = Math.min(1, (time - startedAt) / duration)
        options.write(start + (target - start) * easeInOut(progress))
        if (progress < 1) frame = requestFrame(tick)
        else releaseOnNextFrame()
      }
      frame = requestFrame(tick)
    },
    cancel,
    isFollowing: () => following,
  }
}

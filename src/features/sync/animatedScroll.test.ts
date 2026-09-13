import { describe, expect, it, vi } from 'vitest'
import { createAnimatedScrollController } from './animatedScroll'

function createFrameHarness() {
  let nextId = 1
  const callbacks = new Map<number, FrameRequestCallback>()

  return {
    requestFrame: (callback: FrameRequestCallback) => {
      const id = nextId++
      callbacks.set(id, callback)
      return id
    },
    cancelFrame: (id: number) => callbacks.delete(id),
    advanceTo: (time: number) => {
      const pending = [...callbacks.values()]
      callbacks.clear()
      pending.forEach((callback) => callback(time))
    },
  }
}

describe('animated scroll controller', () => {
  it('moves to the linked position smoothly and suppresses feedback until the next frame', () => {
    const frames = createFrameHarness()
    let scrollTop = 0
    const controller = createAnimatedScrollController({
      read: () => scrollTop,
      write: (value) => { scrollTop = value },
      requestFrame: frames.requestFrame,
      cancelFrame: frames.cancelFrame,
      prefersReducedMotion: () => false,
    })

    controller.scrollTo(100)
    frames.advanceTo(0)
    frames.advanceTo(80)
    expect(scrollTop).toBeGreaterThan(0)
    expect(scrollTop).toBeLessThan(100)
    expect(controller.isFollowing()).toBe(true)

    frames.advanceTo(160)
    expect(scrollTop).toBe(100)
    expect(controller.isFollowing()).toBe(true)

    frames.advanceTo(176)
    expect(controller.isFollowing()).toBe(false)
  })

  it('lets direct user input interrupt an in-flight linked scroll', () => {
    const frames = createFrameHarness()
    let scrollTop = 0
    const write = vi.fn((value: number) => { scrollTop = value })
    const controller = createAnimatedScrollController({
      read: () => scrollTop,
      write,
      requestFrame: frames.requestFrame,
      cancelFrame: frames.cancelFrame,
      prefersReducedMotion: () => false,
    })

    controller.scrollTo(100)
    frames.advanceTo(0)
    const writesBeforeCancel = write.mock.calls.length
    controller.cancel()
    frames.advanceTo(80)

    expect(write).toHaveBeenCalledTimes(writesBeforeCancel)
    expect(controller.isFollowing()).toBe(false)
  })

  it('moves immediately when the user prefers reduced motion', () => {
    const frames = createFrameHarness()
    let scrollTop = 10
    const controller = createAnimatedScrollController({
      read: () => scrollTop,
      write: (value) => { scrollTop = value },
      requestFrame: frames.requestFrame,
      cancelFrame: frames.cancelFrame,
      prefersReducedMotion: () => true,
    })

    controller.scrollTo(90)

    expect(scrollTop).toBe(90)
    expect(controller.isFollowing()).toBe(true)
    frames.advanceTo(16)
    expect(controller.isFollowing()).toBe(false)
  })
})

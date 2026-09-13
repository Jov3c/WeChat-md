import { describe, expect, it } from 'vitest'
import { detectRuntime } from './runtime'

describe('detectRuntime', () => {
  it('keeps ordinary browser globals on the web runtime', () => {
    expect(detectRuntime({ window: {} })).toBe('web')
  })

  it('selects desktop only when the Tauri runtime marker exists', () => {
    expect(detectRuntime({ __TAURI_INTERNALS__: {} })).toBe('desktop')
  })
})

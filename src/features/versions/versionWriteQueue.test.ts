import { describe, expect, it } from 'vitest'
import { createVersionWriteQueue } from './versionWriteQueue'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

describe('createVersionWriteQueue', () => {
  it('finishes writes in the order they were requested', async () => {
    const queue = createVersionWriteQueue()
    const gate = deferred()
    const events: string[] = []

    const save = queue.run(async () => { await gate.promise; events.push('save') })
    const remove = queue.run(async () => { events.push('delete') })
    await Promise.resolve()
    expect(events).toEqual([])

    gate.resolve()
    await Promise.all([save, remove])
    expect(events).toEqual(['save', 'delete'])
  })

  it('continues after a failed write without hiding that failure', async () => {
    const queue = createVersionWriteQueue()
    const failure = queue.run(async () => { throw new Error('disk full') })
    const next = queue.run(async () => 'saved')

    await expect(failure).rejects.toThrow('disk full')
    await expect(next).resolves.toBe('saved')
  })
})

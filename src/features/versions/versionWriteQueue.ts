export interface VersionWriteQueue {
  run<T>(operation: () => Promise<T>): Promise<T>
}

export function createVersionWriteQueue(): VersionWriteQueue {
  let tail: Promise<unknown> = Promise.resolve()
  return {
    run(operation) {
      const result = tail.catch(() => undefined).then(operation)
      tail = result
      return result
    },
  }
}

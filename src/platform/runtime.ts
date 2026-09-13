export type RuntimeKind = 'web' | 'desktop'

export function detectRuntime(scope: unknown = globalThis): RuntimeKind {
  return typeof scope === 'object' && scope !== null && '__TAURI_INTERNALS__' in scope
    ? 'desktop'
    : 'web'
}

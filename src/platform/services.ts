import type { RuntimeServices } from './contracts'
import type { RuntimeKind } from './runtime'

export interface RuntimeServiceLoaders {
  web: () => Promise<RuntimeServices>
  desktop: () => Promise<RuntimeServices>
}

const defaultLoaders: RuntimeServiceLoaders = {
  web: async () => (await import('./webServices')).createWebServices(),
  desktop: async () => (await import('./desktopServices')).createDesktopServices(),
}

export function createRuntimeServices(
  kind: RuntimeKind,
  loaders: RuntimeServiceLoaders = defaultLoaders,
) {
  return loaders[kind]()
}

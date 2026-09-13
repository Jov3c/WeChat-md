import { describe, expect, it } from 'vitest'
import type { RuntimeServices } from './contracts'
import { createRuntimeServices } from './services'

function service(kind: RuntimeServices['kind']): RuntimeServices {
  return {
    kind,
    articleRepository: null,
    assetRepository: null,
    versionRepository: null,
    extractWechatArticle: async () => {
      throw new Error('not used')
    },
  }
}

describe('createRuntimeServices', () => {
  it('loads only browser services for the web runtime', async () => {
    const loaded: string[] = []
    const result = await createRuntimeServices('web', {
      web: async () => { loaded.push('web'); return service('web') },
      desktop: async () => { loaded.push('desktop'); return service('desktop') },
    })

    expect(result.kind).toBe('web')
    expect(loaded).toEqual(['web'])
  })

  it('loads only native services for the desktop runtime', async () => {
    const loaded: string[] = []
    const result = await createRuntimeServices('desktop', {
      web: async () => { loaded.push('web'); return service('web') },
      desktop: async () => { loaded.push('desktop'); return service('desktop') },
    })

    expect(result.kind).toBe('desktop')
    expect(loaded).toEqual(['desktop'])
  })
})

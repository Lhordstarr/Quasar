import type { ProviderModelInfo } from '../../../types'
import type { ModelDependencies } from '../../../types/adapters'
import { getAspectRatioSize, HTTPImageGenerationModel } from './http-image-model'

const POLLINATIONS_IMAGE_BASE = 'https://image.pollinations.ai/prompt/'

export default class Pollinations extends HTTPImageGenerationModel {
  public name = 'Pollinations'

  constructor(options: { model: ProviderModelInfo }, dependencies: ModelDependencies) {
    super({ apiKey: undefined, ...options }, dependencies)
  }

  public async paint(
    params: {
      prompt: string
      images?: { imageUrl: string }[]
      num: number
      aspectRatio?: string
    },
    signal?: AbortSignal,
    callback?: (picBase64: string) => void | Promise<void>
  ): Promise<string[]> {
    const { width, height } = getAspectRatioSize(params.aspectRatio)
    const results: string[] = []
    const count = params.num || 1
    for (let index = 0; index < count; index++) {
      // Vary the seed per image so each generation in the batch differs.
      const seed = (Date.now() + index * 101) % 1000000
      const url = this.buildUrl(params, width, height, seed)
      const dataUrl = await this.fetchImageDataUrl(url, signal)
      results.push(dataUrl)
      await callback?.(dataUrl)
    }
    return results
  }

  private buildUrl(
    params: {
      prompt: string
      images?: { imageUrl: string }[]
    },
    width: number,
    height: number,
    seed: number
  ): string {
    const token = encodeURIComponent(params.prompt.trim())
    const query = new URLSearchParams({
      width: String(width),
      height: String(height),
      seed: String(seed),
      nologo: 'true',
      referrer: 'chatboxai.app',
    })
    if (this.modelId && this.modelId !== 'auto') {
      query.set('model', this.modelId)
    }
    if (params.images?.length) {
      query.set('image', params.images[0].imageUrl)
    }
    return `${POLLINATIONS_IMAGE_BASE}${token}?${query.toString()}`
  }
}

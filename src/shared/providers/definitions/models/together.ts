import { ApiError } from '../../../models/errors'
import { getAspectRatioSize, HTTPImageGenerationModel } from './http-image-model'

const TOGETHER_API_BASE = 'https://api.together.xyz/v1'

export default class Together extends HTTPImageGenerationModel {
  public name = 'Together AI'

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
    if (!this.options.apiKey) {
      throw new ApiError('Together AI API key is required')
    }
    const { width, height } = getAspectRatioSize(params.aspectRatio)
    const results: string[] = []
    const count = params.num || 1
    for (let index = 0; index < count; index++) {
      const body: Record<string, unknown> = {
        model: this.modelId,
        prompt: params.prompt,
        width,
        height,
        response_format: 'b64_json',
      }
      if (params.images?.length) {
        body.image_url = params.images[0].imageUrl
      }

      const response = await this.dependencies.request.fetchWithOptions(`${TOGETHER_API_BASE}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      })

      const json = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> }
      const item = json.data?.[0]
      if (!item) {
        throw new ApiError('Empty response from Together AI')
      }

      let dataUrl: string
      if (item.b64_json) {
        dataUrl = `data:image/png;base64,${item.b64_json}`
      } else if (item.url) {
        dataUrl = await this.fetchImageDataUrl(item.url, signal)
      } else {
        throw new ApiError('Empty response from Together AI')
      }
      results.push(dataUrl)
      await callback?.(dataUrl)
    }
    return results
  }
}

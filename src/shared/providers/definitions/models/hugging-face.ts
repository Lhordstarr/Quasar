import { ApiError } from '../../../models/errors'
import { getAspectRatioSize, HTTPImageGenerationModel } from './http-image-model'

const HF_INFERENCE_BASE = 'https://api-inference.huggingface.co/models/'

export default class HuggingFace extends HTTPImageGenerationModel {
  public name = 'Hugging Face'

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
      throw new ApiError('Hugging Face API key is required')
    }
    const { width, height } = getAspectRatioSize(params.aspectRatio)
    const results: string[] = []
    const count = params.num || 1
    for (let index = 0; index < count; index++) {
      const body: Record<string, unknown> = {
        inputs: params.prompt,
        parameters: { width, height },
        options: { wait_for_model: true },
      }
      if (params.images?.length) {
        body.image = params.images[0].imageUrl
      }

      const response = await this.dependencies.request.fetchWithOptions(`${HF_INFERENCE_BASE}${this.modelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      })

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const json = await response.json().catch(() => null)
        throw new ApiError(`Hugging Face inference error: ${JSON.stringify(json).slice(0, 200)}`)
      }

      const dataUrl = await this.blobToDataUrl(await response.blob())
      results.push(dataUrl)
      await callback?.(dataUrl)
    }
    return results
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }
}

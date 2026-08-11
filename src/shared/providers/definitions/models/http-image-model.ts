import { AIProviderNoImplementedChatError } from '../../../models/errors'
import type {
  CallChatCompletionOptions,
  ChatStreamOptions,
  ModelInterface,
  ModelStreamPart,
} from '../../../models/types'
import type { MessageContentParts, ProviderModelInfo, StreamTextResult } from '../../../types'
import type { ModelDependencies } from '../../../types/adapters'

export interface HTTPImageGenerationModelOptions {
  apiKey?: string
  model: ProviderModelInfo
}

/**
 * Maps the image creator's aspect ratio to concrete pixel dimensions shared by
 * providers that expose width/height controls (Pollinations, Together, Hugging Face).
 */
export function getAspectRatioSize(aspectRatio: string | undefined): { width: number; height: number } {
  switch (aspectRatio) {
    case '3:2':
      return { width: 1152, height: 768 }
    case '2:3':
      return { width: 768, height: 1152 }
    case '4:3':
      return { width: 1024, height: 768 }
    case '3:4':
      return { width: 768, height: 1024 }
    case '16:9':
      return { width: 1344, height: 768 }
    case '9:16':
      return { width: 768, height: 1344 }
    case '21:9':
      return { width: 1512, height: 648 }
    default:
      return { width: 1024, height: 1024 }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Base class for image-only HTTP providers (Pollinations, Together AI, Hugging Face).
 * These providers expose no chat API, so chat/chatStream always reject.
 */
export abstract class HTTPImageGenerationModel implements ModelInterface {
  public name = 'Image Generation Model'
  public modelId: string

  constructor(
    public options: HTTPImageGenerationModelOptions,
    protected dependencies: ModelDependencies
  ) {
    this.modelId = options.model.modelId
  }

  public isSupportVision() {
    return false
  }

  public isSupportToolUse() {
    return false
  }

  public isSupportSystemMessage() {
    return false
  }

  public isSupportReasoning() {
    return false
  }

  public chat(_messages: unknown[], _options: CallChatCompletionOptions): Promise<StreamTextResult> {
    return Promise.reject(new AIProviderNoImplementedChatError(this.name))
  }

  public chatStream(_messages: unknown[], _options: ChatStreamOptions): AsyncGenerator<ModelStreamPart> {
    throw new AIProviderNoImplementedChatError(this.name)
  }

  public normalizeCompletedResponse(contentParts: MessageContentParts, _finishReason: string | undefined) {
    return contentParts
  }

  public abstract paint(
    params: {
      prompt: string
      images?: { imageUrl: string }[]
      num: number
      aspectRatio?: string
    },
    signal?: AbortSignal,
    callback?: (picBase64: string) => void | Promise<void>
  ): Promise<string[]>

  /** Downloads a remote image (provider URL or data URL) and returns it as a base64 data URL. */
  protected async fetchImageDataUrl(imageUrl: string, signal?: AbortSignal): Promise<string> {
    if (imageUrl.startsWith('data:')) {
      return imageUrl
    }
    const response = await this.dependencies.request.fetchWithOptions(imageUrl, {
      headers: { Accept: 'image/*' },
      signal,
    })
    const blob = await response.blob()
    return blobToDataUrl(blob)
  }
}

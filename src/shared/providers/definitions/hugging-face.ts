import { ModelProviderEnum, ModelProviderType } from '../../types'
import { defineProvider } from '../registry'
import { HUGGING_FACE_IMAGE_MODELS } from './image-models'
import HuggingFace from './models/hugging-face'

export const huggingFaceProvider = defineProvider({
  id: ModelProviderEnum.HuggingFace,
  name: 'Hugging Face',
  type: ModelProviderType.HuggingFace,
  description: 'Image generation via the Hugging Face Inference API.',
  urls: {
    website: 'https://huggingface.co/',
    apiKey: 'https://huggingface.co/settings/tokens',
    docs: 'https://huggingface.co/docs/api-inference/index',
  },
  defaultSettings: {
    models: HUGGING_FACE_IMAGE_MODELS.map((m) => ({
      modelId: m.modelId,
      nickname: m.nickname,
      type: 'image',
      capabilities: [],
    })),
  },
  createModel: (config) => {
    return new HuggingFace(
      {
        apiKey: config.effectiveApiKey,
        model: config.model,
      },
      config.dependencies
    )
  },
  getDisplayName: (modelId, providerSettings) => {
    return `Hugging Face (${providerSettings?.models?.find((m) => m.modelId === modelId)?.nickname || modelId})`
  },
})

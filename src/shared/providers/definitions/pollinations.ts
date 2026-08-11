import { ModelProviderEnum, ModelProviderType } from '../../types'
import { defineProvider } from '../registry'
import { POLLINATIONS_IMAGE_MODELS } from './image-models'
import Pollinations from './models/pollinations'

export const pollinationsProvider = defineProvider({
  id: ModelProviderEnum.Pollinations,
  name: 'Pollinations',
  type: ModelProviderType.Pollinations,
  description: 'Free AI image generation. No API key required.',
  urls: {
    website: 'https://pollinations.ai/',
  },
  defaultSettings: {
    models: POLLINATIONS_IMAGE_MODELS.map((m) => ({
      modelId: m.modelId,
      nickname: m.nickname,
      type: 'image',
      capabilities: [],
    })),
  },
  createModel: (config) => {
    return new Pollinations(
      {
        model: config.model,
      },
      config.dependencies
    )
  },
  getDisplayName: (modelId, providerSettings) => {
    return `Pollinations (${providerSettings?.models?.find((m) => m.modelId === modelId)?.nickname || modelId})`
  },
})

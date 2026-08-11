import { ModelProviderEnum, ModelProviderType } from '../../types'
import { defineProvider } from '../registry'
import { TOGETHER_IMAGE_MODELS } from './image-models'
import Together from './models/together'

export const togetherProvider = defineProvider({
  id: ModelProviderEnum.Together,
  name: 'Together AI',
  type: ModelProviderType.Together,
  description: 'Image generation via the Together AI API.',
  urls: {
    website: 'https://www.together.ai/',
    apiKey: 'https://api.together.ai/settings/api-keys',
    docs: 'https://docs.together.ai/docs/images-overview',
  },
  defaultSettings: {
    models: TOGETHER_IMAGE_MODELS.map((m) => ({
      modelId: m.modelId,
      nickname: m.nickname,
      type: 'image',
      capabilities: [],
    })),
  },
  createModel: (config) => {
    return new Together(
      {
        apiKey: config.effectiveApiKey,
        model: config.model,
      },
      config.dependencies
    )
  },
  getDisplayName: (modelId, providerSettings) => {
    return `Together AI (${providerSettings?.models?.find((m) => m.modelId === modelId)?.nickname || modelId})`
  },
})

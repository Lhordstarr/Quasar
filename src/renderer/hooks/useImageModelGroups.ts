import { ModelProviderEnum, ModelProviderType } from '@shared/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  type ImageModelOption,
  isOpenAIImageGenerationAuthSupported,
  loadProviderImageModels,
  manualImageModelToOption,
  mergeImageModels,
} from '@/packages/image-model-catalog'
import { useLanguage, useSettingsStore } from '@/stores/settingsStore'
import useChatboxAIModels from './useChatboxAIModels'
import { useProviders } from './useProviders'

export interface ImageModelGroup {
  label: string
  providerId: string
  isCustom?: boolean
  models: ImageModelOption[]
}

export function useProviderImageModels(provider: ModelProviderEnum, enabled: boolean): ImageModelOption[] {
  const language = useLanguage()
  const licenseKey = useSettingsStore((state) => state.licenseKey)

  const { data } = useQuery({
    queryKey: [
      'provider-image-models',
      provider,
      language,
      provider === ModelProviderEnum.ChatboxAI ? licenseKey || '' : '',
    ],
    enabled,
    staleTime: 3600 * 1000,
    queryFn: () =>
      loadProviderImageModels(provider, {
        language,
        licenseKey,
      }),
  })

  return data || []
}

export function useImageModelGroups(): ImageModelGroup[] {
  const { providers } = useProviders()
  const { chatboxAIImageModels } = useChatboxAIModels()
  const providerSettingsMap = useSettingsStore((state) => state.providers)

  const chatboxProvider = providers.find((p) => p.id === ModelProviderEnum.ChatboxAI)
  const openAIProvider = providers.find((p) => p.id === ModelProviderEnum.OpenAI)
  const geminiProvider = providers.find((p) => p.id === ModelProviderEnum.Gemini)
  const togetherProvider = providers.find((p) => p.id === ModelProviderEnum.Together)
  const huggingFaceProvider = providers.find((p) => p.id === ModelProviderEnum.HuggingFace)
  const customGeminiProviders = providers.filter((p) => p.isCustom && p.type === ModelProviderType.Gemini)

  const openAIImageModels = useProviderImageModels(ModelProviderEnum.OpenAI, !!openAIProvider)
  const geminiImageModels = useProviderImageModels(
    ModelProviderEnum.Gemini,
    !!geminiProvider || customGeminiProviders.length > 0
  )
  const pollinationsImageModels = useProviderImageModels(ModelProviderEnum.Pollinations, true)
  const togetherImageModels = useProviderImageModels(ModelProviderEnum.Together, !!togetherProvider)
  const huggingFaceImageModels = useProviderImageModels(ModelProviderEnum.HuggingFace, !!huggingFaceProvider)

  return useMemo(() => {
    const groups: ImageModelGroup[] = []
    if (chatboxProvider) {
      const excluded = new Set(providerSettingsMap?.[ModelProviderEnum.ChatboxAI]?.excludedModels || [])
      const models = chatboxAIImageModels.map(manualImageModelToOption).filter((model) => !excluded.has(model.modelId))
      if (models.length > 0) {
        groups.push({
          label: chatboxProvider.name,
          providerId: chatboxProvider.id,
          models,
        })
      }
    }

    if (geminiProvider) {
      const manualModels = (providerSettingsMap?.[geminiProvider.id]?.models || [])
        .filter((model) => model.type === 'image')
        .map(manualImageModelToOption)
      const models = mergeImageModels(geminiImageModels, manualModels)
      if (models.length > 0) {
        groups.push({
          label: geminiProvider.name,
          providerId: geminiProvider.id,
          models,
        })
      }
    }

    for (const provider of customGeminiProviders) {
      const manualModels = (providerSettingsMap?.[provider.id]?.models || [])
        .filter((model) => model.type === 'image')
        .map(manualImageModelToOption)
      const models = mergeImageModels(geminiImageModels, manualModels)
      if (models.length > 0) {
        groups.push({
          label: provider.name,
          providerId: provider.id,
          isCustom: true,
          models,
        })
      }
    }

    if (openAIProvider && isOpenAIImageGenerationAuthSupported(providerSettingsMap)) {
      const manualModels = (providerSettingsMap?.[openAIProvider.id]?.models || [])
        .filter((model) => model.type === 'image')
        .map(manualImageModelToOption)
      const models = mergeImageModels(openAIImageModels, manualModels)
      if (models.length > 0) {
        groups.push({
          label: openAIProvider.name,
          providerId: openAIProvider.id,
          models,
        })
      }
    }

    if (pollinationsImageModels.length > 0) {
      const manualModels = (providerSettingsMap?.[ModelProviderEnum.Pollinations]?.models || [])
        .filter((model) => model.type === 'image')
        .map(manualImageModelToOption)
      groups.push({
        label: 'Pollinations AI (Free)',
        providerId: ModelProviderEnum.Pollinations,
        models: mergeImageModels(pollinationsImageModels, manualModels),
      })
    }

    if (togetherProvider) {
      const manualModels = (providerSettingsMap?.[togetherProvider.id]?.models || [])
        .filter((model) => model.type === 'image')
        .map(manualImageModelToOption)
      const models = mergeImageModels(togetherImageModels, manualModels)
      if (models.length > 0) {
        groups.push({
          label: togetherProvider.name,
          providerId: togetherProvider.id,
          models,
        })
      }
    }

    if (huggingFaceProvider) {
      const manualModels = (providerSettingsMap?.[huggingFaceProvider.id]?.models || [])
        .filter((model) => model.type === 'image')
        .map(manualImageModelToOption)
      const models = mergeImageModels(huggingFaceImageModels, manualModels)
      if (models.length > 0) {
        groups.push({
          label: huggingFaceProvider.name,
          providerId: huggingFaceProvider.id,
          models,
        })
      }
    }

    return groups
  }, [
    chatboxProvider,
    openAIProvider,
    geminiProvider,
    togetherProvider,
    huggingFaceProvider,
    customGeminiProviders,
    providerSettingsMap,
    chatboxAIImageModels,
    openAIImageModels,
    geminiImageModels,
    pollinationsImageModels,
    togetherImageModels,
    huggingFaceImageModels,
  ])
}

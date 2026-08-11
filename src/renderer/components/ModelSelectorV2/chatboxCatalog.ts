import type { ChatboxAIModelList } from '@/packages/remote'

export type ChatboxAIGroupView = {
  id: string
  modelIds: string[]
  total: number
}

export function getChatboxAIModelName(model: { modelName?: string; modelId: string }): string {
  return model.modelName || model.modelId
}

export function modelMatchesSearch(
  model: { modelId: string; modelName?: string },
  search: string,
  providerName = 'Chatbox AI'
): boolean {
  const query = search.trim().toLowerCase()
  if (!query) return true
  return (
    providerName.toLowerCase().includes(query) ||
    model.modelId.toLowerCase().includes(query) ||
    getChatboxAIModelName(model).toLowerCase().includes(query)
  )
}

export function buildChatboxAIGroupViews(params: {
  catalog: ChatboxAIModelList
  search: string
  collapsedGroupIds: Set<string>
  modelFilter?: (modelId: string) => boolean
}): ChatboxAIGroupView[] {
  const { catalog, search, collapsedGroupIds, modelFilter } = params

  return catalog.groups.map((group) => {
    const visibleIds = collapsedGroupIds.has(group.id)
      ? []
      : group.modelIds.filter((modelId) => {
          const model = catalog.models[modelId]
          if (!model) return false
          if (modelFilter && !modelFilter(modelId)) return false
          return modelMatchesSearch(model, search, catalog.provider.name)
        })

    const total = group.modelIds.filter((modelId) => {
      const model = catalog.models[modelId]
      if (!model) return false
      return modelFilter ? modelFilter(modelId) : true
    }).length

    return {
      id: group.id,
      modelIds: visibleIds,
      total,
    }
  })
}

import { Flex, Text } from '@mantine/core'
import type { ProviderModelInfo } from '@shared/types'
import { ModelProviderEnum } from '@shared/types'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { ChatboxAIModelList } from '@/packages/remote'
import { type ChatboxAIGroupView, getChatboxAIModelName, modelMatchesSearch } from './chatboxCatalog'
import { MOBILE_TAP_RESET_STYLE, MODEL_SELECTOR_SURFACE_CLASS } from './constants'
import { getGroupLabel, toProviderModelInfo } from './helpers'
import { ModelRow } from './ModelRow'
import { ProviderRowHeader } from './ProviderRowHeader'
import type { ChatboxAIModel, DetailModel } from './types'

type FavoriteSetting = {
  provider: string
  model: string
}

export function ChatboxProviderRows({
  catalog,
  provider,
  favoriteOnly,
  favorites,
  search,
  groups,
  collapsed,
  selectedProviderId,
  selectedModelId,
  isMobile,
  modelDisabledCheck,
  chatboxFilter,
  isFavorited,
  onToggleProvider,
  onToggleGroup,
  onSelect,
  onToggleFavorite,
  onShowMobileDetail,
  onDesktopDetailOpen,
  onDesktopDetailClose,
  onDisabledSelect,
}: {
  catalog: ChatboxAIModelList
  provider: { id: string; name: string }
  favoriteOnly: boolean
  favorites?: FavoriteSetting[]
  search: string
  groups: ChatboxAIGroupView[]
  collapsed: boolean
  selectedProviderId?: string
  selectedModelId?: string
  isMobile: boolean
  modelDisabledCheck?: (model: ProviderModelInfo, providerId?: string) => string | undefined
  chatboxFilter: (model: ChatboxAIModel) => boolean
  isFavorited: (providerId: string, modelId: string) => boolean
  onToggleProvider: () => void
  onToggleGroup: (groupId: string) => void
  onSelect: (providerId: string, modelId: string) => void
  onToggleFavorite: (providerId: string, modelId: string) => void
  onShowMobileDetail: (detail: DetailModel) => void
  onDesktopDetailOpen: (key: string, detail: DetailModel, pricingLink: string | undefined, anchor: HTMLElement) => void
  onDesktopDetailClose: () => void
  onDisabledSelect: (modelId: string) => void
}) {
  const { t } = useTranslation()
  const selectedProviderMatches =
    selectedProviderId === provider.id ||
    (provider.name === 'Quasar' && selectedProviderId === ModelProviderEnum.ChatboxAI)
  const favoriteSet = new Set(
    (favorites || []).filter((favorite) => favorite.provider === provider.id).map((favorite) => favorite.model)
  )
  if (favoriteOnly && favoriteSet.size === 0) return null

  const modelCount = catalog.groups.reduce(
    (count, group) =>
      count +
      group.modelIds.filter((modelId) => {
        const model = catalog.models[modelId]
        return model ? chatboxFilter(model) : false
      }).length,
    0
  )
  const renderGroups = favoriteOnly
    ? catalog.groups.map((group) => ({
        id: group.id,
        modelIds: group.modelIds.filter((modelId) => {
          const model = catalog.models[modelId]
          if (!model || !favoriteSet.has(modelId) || !chatboxFilter(model)) return false
          return modelMatchesSearch(model, search, provider.name)
        }),
        total: group.modelIds.length,
      }))
    : groups
  const rows = renderGroups.map((group) => {
    const groupRows = group.modelIds
      .map((modelId) => {
        const model = catalog.models[modelId]
        if (!model) return null
        const providerModel = toProviderModelInfo(model)
        const disabledReason = model.access.available
          ? modelDisabledCheck?.(providerModel, provider.id)
          : t('Unavailable')
        const detail: DetailModel = {
          providerId: provider.id,
          providerName: provider.name,
          modelId,
          name: getChatboxAIModelName(model),
          capabilities: model.capabilities,
          costLevel: model.costLevel,
          description: model.description,
          pricing: model.pricing,
          disabledReason,
        }
        const detailKey = `${provider.id}/${modelId}`
        return (
          <ModelRow
            key={detailKey}
            detail={detail}
            providerModel={providerModel}
            selected={selectedProviderMatches && selectedModelId === modelId}
            favorited={isFavorited(provider.id, modelId)}
            mobile={isMobile}
            brandedInset
            onSelect={() => onSelect(provider.id, modelId)}
            onFavorite={() => onToggleFavorite(provider.id, modelId)}
            onShowDetail={() => onShowMobileDetail(detail)}
            onDesktopDetailOpen={(anchor) =>
              onDesktopDetailOpen(detailKey, detail, catalog.links?.modelPricing, anchor)
            }
            onDesktopDetailClose={onDesktopDetailClose}
            onDisabledSelect={() => onDisabledSelect(detail.modelId)}
          />
        )
      })
      .filter((row) => row !== null)

    if (favoriteOnly && groupRows.length === 0) return null

    return (
      <div key={group.id}>
        {!favoriteOnly && (
          <Flex
            component="button"
            type="button"
            align="center"
            gap="xs"
            className="w-full min-h-9 pl-4 pr-2.5 py-2 border-0 border-b border-solid border-chatbox-border-primary bg-chatbox-background-secondary text-chatbox-tint-secondary cursor-pointer focus:outline-none focus-visible:outline-none hover:bg-chatbox-background-secondary-hover active:bg-chatbox-background-secondary-hover"
            style={isMobile ? MOBILE_TAP_RESET_STYLE : undefined}
            onClick={() => onToggleGroup(group.id)}
          >
            <Text span fw={650} size="sm" lh={1.15}>
              {getGroupLabel(group.id, t)}:
            </Text>
          </Flex>
        )}
        {groupRows}
      </div>
    )
  })

  return (
    <section
      className={clsx(
        'relative border-0 border-b border-solid border-chatbox-border-primary',
        MODEL_SELECTOR_SURFACE_CLASS,
        isMobile ? 'mb-2' : 'mb-1'
      )}
    >
      <div aria-hidden className="absolute bottom-0 left-0 top-0 w-[3px] bg-chatbox-tint-brand" />
      <ProviderRowHeader
        provider={provider}
        modelCount={modelCount}
        collapsed={collapsed}
        variant="chatbox"
        onToggle={onToggleProvider}
      />
      {!collapsed && rows}
    </section>
  )
}

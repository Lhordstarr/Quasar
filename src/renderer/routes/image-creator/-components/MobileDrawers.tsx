import { ActionIcon, Box, Flex, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core'
import type { ImageGeneration } from '@shared/types'
import { IconCheck, IconChevronLeft, IconChevronRight, IconPlus, IconServer } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import ProviderIcon from '@/components/icons/ProviderIcon'
import { HistoryListContent } from './HistoryPanel'

/* ============================================
   Mobile History Drawer
   ============================================ */

export interface MobileHistoryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  historyCache: ImageGeneration[]
  historyLoading: boolean
  currentRecordId: string | null
  getModelDisplayName: (record: ImageGeneration) => string
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onItemClick: (record: ImageGeneration) => void
  onLoadMore: () => void
  onNewCreation: () => void
  onDelete: (id: string) => void
}

export function MobileHistoryDrawer({
  open,
  onOpenChange,
  historyCache,
  historyLoading,
  currentRecordId,
  getModelDisplayName,
  hasNextPage,
  isFetchingNextPage,
  onItemClick,
  onLoadMore,
  onNewCreation,
  onDelete,
}: MobileHistoryDrawerProps) {
  const { t } = useTranslation()

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} noBodyStyles>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-chatbox-background-mask-overlay" />
        <Drawer.Content className="flex flex-col rounded-t-xl h-[70vh] fixed bottom-0 left-0 right-0 outline-none bg-[var(--chatbox-background-primary)]">
          <Drawer.Handle />
          <Flex
            align="center"
            justify="space-between"
            px="md"
            py="sm"
            className="border-b border-[var(--chatbox-border-primary)]"
          >
            <Drawer.Title asChild>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                {t('History')}
              </Text>
            </Drawer.Title>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => {
                onNewCreation()
                onOpenChange(false)
              }}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Flex>

          <Box flex={1}>
            <HistoryListContent
              historyCache={historyCache}
              historyLoading={historyLoading}
              currentRecordId={currentRecordId}
              getModelDisplayName={getModelDisplayName}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              isMobile
              onItemClick={(record) => {
                onItemClick(record)
                onOpenChange(false)
              }}
              onLoadMore={onLoadMore}
              onDelete={onDelete}
            />
          </Box>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/* ============================================
   Mobile Model Drawer
   ============================================ */

export interface MobileModelGroup {
  label: string
  providerId: string
  isCustom?: boolean
  models: { modelId: string; displayName: string }[]
}

export interface MobileModelDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelGroups: MobileModelGroup[]
  selectedProvider: string
  selectedModel: string
  onSelect: (provider: string, model: string) => void
}

function providerLabel(group: MobileModelGroup): string {
  return group.models.length === 1 ? `${group.label} - ${group.models[0].displayName}` : group.label
}

function isGroupSelected(group: MobileModelGroup, selectedProvider: string, selectedModel: string): boolean {
  return group.providerId === selectedProvider && group.models.some((model) => model.modelId === selectedModel)
}

export function MobileModelDrawer({
  open,
  onOpenChange,
  modelGroups,
  selectedProvider,
  selectedModel,
  onSelect,
}: MobileModelDrawerProps) {
  const { t } = useTranslation()
  const [stage, setStage] = useState<{ type: 'providers' } | { type: 'models'; group: MobileModelGroup }>({
    type: 'providers',
  })

  useEffect(() => {
    if (open) {
      setStage({ type: 'providers' })
    }
  }, [open])

  const handleProviderSelect = (group: MobileModelGroup) => {
    if (group.models.length === 1) {
      onSelect(group.providerId, group.models[0].modelId)
      onOpenChange(false)
    } else {
      setStage({ type: 'models', group })
    }
  }

  const selectedGroup = stage.type === 'models' ? stage.group : null

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} noBodyStyles>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-chatbox-background-mask-overlay" />
        <Drawer.Content className="flex flex-col rounded-t-xl max-h-[70vh] fixed bottom-0 left-0 right-0 outline-none bg-[var(--chatbox-background-primary)]">
          <Drawer.Handle />
          <Flex
            align="center"
            justify="space-between"
            px="md"
            py="sm"
            className="border-b border-[var(--chatbox-border-primary)]"
          >
            <Drawer.Title asChild>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                {selectedGroup ? selectedGroup.label : t('Select Model')}
              </Text>
            </Drawer.Title>
            {selectedGroup && (
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setStage({ type: 'providers' })}>
                <IconChevronLeft size={16} />
              </ActionIcon>
            )}
          </Flex>

          <ScrollArea flex={1} type="auto" offsetScrollbars>
            <Stack gap={2} p="xs" pb="xl">
              {selectedGroup
                ? selectedGroup.models.map((model) => {
                    const isSelected = selectedProvider === selectedGroup.providerId && selectedModel === model.modelId
                    return (
                      <UnstyledButton
                        key={`${selectedGroup.providerId}:${model.modelId}`}
                        onClick={() => {
                          onSelect(selectedGroup.providerId, model.modelId)
                          onOpenChange(false)
                        }}
                        className={`
                        w-full px-4 py-3 rounded-lg transition-colors
                        ${isSelected ? 'bg-[var(--chatbox-background-brand-secondary)]' : 'hover:bg-[var(--chatbox-background-secondary)]'}
                      `}
                      >
                        <Flex align="center" gap={8}>
                          <Text size="sm" fw={isSelected ? 600 : 400} className="flex-1">
                            {model.displayName}
                          </Text>
                          {isSelected && <IconCheck size={16} className="text-[var(--chatbox-tint-brand)] shrink-0" />}
                        </Flex>
                      </UnstyledButton>
                    )
                  })
                : modelGroups.map((group) => {
                    const isSelected = isGroupSelected(group, selectedProvider, selectedModel)
                    return (
                      <UnstyledButton
                        key={group.providerId}
                        onClick={() => handleProviderSelect(group)}
                        className={`
                        w-full px-4 py-3 rounded-lg transition-colors
                        ${isSelected ? 'bg-[var(--chatbox-background-brand-secondary)]' : 'hover:bg-[var(--chatbox-background-secondary)]'}
                      `}
                      >
                        <Flex align="center" gap={10}>
                          {group.isCustom ? (
                            <ScalableIcon icon={IconServer} size={16} className="text-chatbox-tint-gray shrink-0" />
                          ) : (
                            <ProviderIcon size={16} provider={group.providerId} className="opacity-70 shrink-0" />
                          )}
                          <Text size="sm" fw={isSelected ? 600 : 400} className="flex-1 truncate">
                            {providerLabel(group)}
                          </Text>
                          {isSelected && <IconCheck size={16} className="text-[var(--chatbox-tint-brand)] shrink-0" />}
                          {group.models.length > 1 && (
                            <IconChevronRight size={16} className="text-[var(--chatbox-tint-tertiary)] shrink-0" />
                          )}
                        </Flex>
                      </UnstyledButton>
                    )
                  })}
              {modelGroups.length === 0 && (
                <Text size="sm" c="dimmed" px="sm" py="xs" ta="center">
                  {t('No models available')}
                </Text>
              )}
            </Stack>
          </ScrollArea>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/* ============================================
   Mobile Ratio Drawer
   ============================================ */

export interface MobileRatioDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: string[]
  selectedRatio: string
  onSelect: (ratio: string) => void
}

export function MobileRatioDrawer({ open, onOpenChange, options, selectedRatio, onSelect }: MobileRatioDrawerProps) {
  const { t } = useTranslation()

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} noBodyStyles>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-chatbox-background-mask-overlay" />
        <Drawer.Content className="flex flex-col rounded-t-xl fixed bottom-0 left-0 right-0 outline-none bg-[var(--chatbox-background-primary)]">
          <Drawer.Handle />
          <Flex
            align="center"
            justify="space-between"
            px="md"
            py="sm"
            className="border-b border-[var(--chatbox-border-primary)]"
          >
            <Drawer.Title asChild>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                {t('Aspect Ratio')}
              </Text>
            </Drawer.Title>
          </Flex>

          <Stack gap={2} p="xs" pb="xl">
            {options.map((ratio) => (
              <UnstyledButton
                key={ratio}
                onClick={() => {
                  onSelect(ratio)
                  onOpenChange(false)
                }}
                className={`
                  w-full px-4 py-3 rounded-lg transition-colors
                  ${selectedRatio === ratio ? 'bg-[var(--chatbox-background-brand-secondary)]' : 'hover:bg-[var(--chatbox-background-secondary)]'}
                `}
              >
                <Text size="sm" fw={selectedRatio === ratio ? 600 : 400} ta="center">
                  {ratio}
                </Text>
              </UnstyledButton>
            ))}
          </Stack>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

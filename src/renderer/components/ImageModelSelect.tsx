import { Combobox, type ComboboxProps, Flex, Text, UnstyledButton, useCombobox } from '@mantine/core'
import type { ModelProvider } from '@shared/types'
import { IconCheck, IconChevronLeft, IconChevronRight, IconServer } from '@tabler/icons-react'
import { forwardRef, type PropsWithChildren, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImageModelGroup } from '@/hooks/useImageModelGroups'
import { ScalableIcon } from './common/ScalableIcon'
import ProviderIcon from './icons/ProviderIcon'

function ProviderGroupLabel({ providerId, name, isCustom }: { providerId: string; name: string; isCustom?: boolean }) {
  return (
    <Flex align="center" gap={6} className="px-2 pt-2.5 pb-1">
      {isCustom ? (
        <ScalableIcon icon={IconServer} size={12} className="text-chatbox-tint-gray" />
      ) : (
        <ProviderIcon size={12} provider={providerId} className="opacity-50" />
      )}
      <Text size="xs" fw={500} c="dimmed">
        {name}
      </Text>
    </Flex>
  )
}

function providerLabel(group: ImageModelGroup): string {
  return group.models.length === 1 ? `${group.label} - ${group.models[0].displayName}` : group.label
}

function isGroupSelected(group: ImageModelGroup, selectedProvider?: string, selectedModel?: string): boolean {
  return group.providerId === selectedProvider && group.models.some((model) => model.modelId === selectedModel)
}

export type ImageModelSelectProps = PropsWithChildren<
  {
    modelGroups: ImageModelGroup[]
    onSelect?: (provider: ModelProvider, model: string) => void
    selectedProvider?: string
    selectedModel?: string
  } & ComboboxProps
>

type SelectionStage = { type: 'providers' } | { type: 'models'; group: ImageModelGroup }

export const ImageModelSelect = forwardRef<HTMLButtonElement, ImageModelSelectProps>(
  ({ modelGroups, onSelect, selectedProvider, selectedModel, children, ...comboboxProps }, ref) => {
    const { t } = useTranslation()
    const [stage, setStage] = useState<SelectionStage>({ type: 'providers' })

    const combobox = useCombobox({
      onDropdownClose: () => {
        setStage({ type: 'providers' })
        combobox.resetSelectedOption()
        combobox.focusTarget()
      },
    })

    const handleOptionSubmit = (val: string) => {
      const parsed = JSON.parse(val) as {
        type: 'provider' | 'model'
        providerId?: string
        provider?: string
        modelId?: string
      }
      if (parsed.type === 'provider') {
        const group = modelGroups.find((item) => item.providerId === parsed.providerId)
        if (!group) return
        if (group.models.length === 1) {
          onSelect?.(group.providerId as ModelProvider, group.models[0].modelId)
          combobox.closeDropdown()
        } else {
          setStage({ type: 'models', group })
        }
      } else if (parsed.type === 'model' && parsed.provider && parsed.modelId) {
        onSelect?.(parsed.provider as ModelProvider, parsed.modelId)
        combobox.closeDropdown()
      }
    }

    const selectedGroup = stage.type === 'models' ? stage.group : null

    return (
      <Combobox
        store={combobox}
        width={280}
        position="top"
        withinPortal={true}
        {...comboboxProps}
        onOptionSubmit={handleOptionSubmit}
      >
        <Combobox.Target targetType="button">
          <button ref={ref} onClick={() => combobox.toggleDropdown()} className="border-none bg-transparent p-0 flex">
            {children}
          </button>
        </Combobox.Target>

        <Combobox.Dropdown className="!rounded-lg !border-[var(--chatbox-border-primary)] !shadow-lg overflow-hidden">
          <Combobox.Options mah={400} style={{ overflowY: 'auto' }} className="p-1">
            {modelGroups.length === 0 ? (
              <Text size="sm" c="dimmed" px="sm" py="xs">
                {t('No models available')}
              </Text>
            ) : !selectedGroup ? (
              modelGroups.map((group) => {
                const selected = isGroupSelected(group, selectedProvider, selectedModel)
                return (
                  <Combobox.Option
                    key={group.providerId}
                    value={JSON.stringify({ type: 'provider', providerId: group.providerId })}
                    className="!rounded-lg"
                  >
                    <Flex align="center" gap={8}>
                      {group.isCustom ? (
                        <ScalableIcon icon={IconServer} size={14} className="text-chatbox-tint-gray" />
                      ) : (
                        <ProviderIcon size={14} provider={group.providerId} className="opacity-70" />
                      )}
                      <Text size="sm" fw={selected ? 600 : 400} className="flex-1 truncate">
                        {providerLabel(group)}
                      </Text>
                      {selected && <IconCheck size={14} className="text-[var(--chatbox-tint-brand)] shrink-0" />}
                      {group.models.length > 1 && (
                        <IconChevronRight size={14} className="text-[var(--chatbox-tint-tertiary)] shrink-0" />
                      )}
                    </Flex>
                  </Combobox.Option>
                )
              })
            ) : (
              <>
                <Flex align="center" gap={4} className="py-1 px-1">
                  <UnstyledButton
                    onClick={() => setStage({ type: 'providers' })}
                    className="flex items-center justify-center p-1 rounded-md hover:bg-[var(--chatbox-background-secondary)]"
                    aria-label={t('Back')}
                  >
                    <IconChevronLeft size={16} className="text-[var(--chatbox-tint-secondary)]" />
                  </UnstyledButton>
                  <ProviderGroupLabel
                    providerId={selectedGroup.providerId}
                    name={selectedGroup.label}
                    isCustom={selectedGroup.isCustom}
                  />
                </Flex>
                {selectedGroup.models.map((model) => {
                  const selected = selectedProvider === selectedGroup.providerId && selectedModel === model.modelId
                  return (
                    <Combobox.Option
                      key={`${selectedGroup.providerId}:${model.modelId}`}
                      value={JSON.stringify({
                        type: 'model',
                        provider: selectedGroup.providerId,
                        modelId: model.modelId,
                      })}
                      className="!rounded-lg"
                    >
                      <Flex align="center" gap={8}>
                        <Text size="sm" fw={selected ? 600 : 400} className="flex-1">
                          {model.displayName}
                        </Text>
                        {selected && <IconCheck size={14} className="text-[var(--chatbox-tint-brand)] shrink-0" />}
                      </Flex>
                    </Combobox.Option>
                  )
                })}
              </>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    )
  }
)

ImageModelSelect.displayName = 'ImageModelSelect'

export default ImageModelSelect

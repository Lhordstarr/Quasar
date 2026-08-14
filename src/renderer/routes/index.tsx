import NiceModal from '@ebay/nice-modal-react'
import { Box, Stack, Text } from '@mantine/core'
import {
  type AgentModeEntry,
  createMessage,
  ModelProviderEnum,
  type Session,
  type SessionSettings,
} from '@shared/types'
import { createFileRoute } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { trackJkClickEvent } from '@/analytics/jk'
import { JK_EVENTS, JK_PAGE_NAMES } from '@/analytics/jk-events'
import InputBox, { type InputBoxPayload } from '@/components/InputBox/InputBox'
import HomepageIcon from '@/components/icons/HomepageIcon'
import Page from '@/components/layout/Page'
import { getForceShowNewUserScenarioCardsFlag } from '@/dev/devToolsFlags'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import { useAuthInfoStore } from '@/stores/authInfoStore'
import { createSession as createSessionStore } from '@/stores/chatStore'
import { getHasCompletedFirstSuccessfulChat } from '@/stores/firstSuccessfulChat'
import { generate, submitNewUserMessage, switchCurrentSession } from '@/stores/sessionActions'
import { initEmptyChatSession } from '@/stores/sessionHelpers'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { NewUserScenarioGrid } from './-new-user-scenarios/NewUserScenarioGrid'
import { type NewUserScenario, newUserScenarios, resolveNewUserScenarioContent } from './-new-user-scenarios/scenarios'

const scenarioAgentModeOff = {
  value: 'off',
  locked: false,
  lockReason: null,
} satisfies AgentModeEntry

const firstChatScenarioDefaultModel = {
  provider: ModelProviderEnum.ChatboxAI,
  modelId: undefined,
} satisfies Pick<SessionSettings, 'provider' | 'modelId'>

export const Route = createFileRoute('/')({
  component: Index,
  validateSearch: zodValidator(
    z.object({
      settings: z.string().optional(),
    })
  ),
})

function Index() {
  const { t, i18n } = useTranslation()
  const isSmallScreen = useIsSmallScreen()

  const newSessionState = useUIStore((s) => s.newSessionState)
  const setNewSessionState = useUIStore((s) => s.setNewSessionState)
  const addSessionKnowledgeBase = useUIStore((s) => s.addSessionKnowledgeBase)
  const sessionWebBrowsingMap = useUIStore((s) => s.sessionWebBrowsingMap)
  const setSessionWebBrowsing = useUIStore((s) => s.setSessionWebBrowsing)
  const clearSessionWebBrowsing = useUIStore((s) => s.clearSessionWebBrowsing)
  const sessionAgentModeMap = useUIStore((s) => s.sessionAgentModeMap)
  const clearSessionAgentMode = useUIStore((s) => s.clearSessionAgentMode)
  const [session, setSession] = useState<Session>({
    id: 'new',
    ...initEmptyChatSession(),
  })
  const [hasCompletedFirstSuccessfulChat, setHasCompletedFirstSuccessfulChat] = useState<boolean | null>(null)
  const [forceShowNewUserScenarioCards, setForceShowNewUserScenarioCards] = useState(
    getForceShowNewUserScenarioCardsFlag
  )
  const hasUserSelectedModelRef = useRef(false)

  const defaultChatModel = useSettingsStore((s) => s.defaultChatModel)
  const licenseKey = useSettingsStore((s) => s.licenseKey)
  const licenseDetail = useSettingsStore((s) => s.licenseDetail)
  const licensePlanName = useSettingsStore((s) => s.licensePlanName)
  const hasExpiredLicense = useSettingsStore((s) => s.hasExpiredLicense)
  const isLoggedIn = useAuthInfoStore((s) => Boolean(s.accessToken && s.refreshToken))

  const selectedModel = useMemo(() => {
    if (session.settings?.provider && session.settings?.modelId) {
      return {
        provider: session.settings.provider,
        modelId: session.settings.modelId,
      }
    }
  }, [session.settings?.provider, session.settings?.modelId])

  useEffect(() => {
    let cancelled = false

    setForceShowNewUserScenarioCards(getForceShowNewUserScenarioCardsFlag())

    getHasCompletedFirstSuccessfulChat()
      .then((completed) => {
        if (!cancelled) {
          setHasCompletedFirstSuccessfulChat(completed)
        }
      })
      .catch((error) => {
        console.warn('[new-user-scenarios] failed to resolve first successful chat state:', error)
        if (!cancelled) {
          setHasCompletedFirstSuccessfulChat(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSession((old) => {
      if (hasCompletedFirstSuccessfulChat === false && isLoggedIn && !hasUserSelectedModelRef.current) {
        if (
          old.settings?.provider === firstChatScenarioDefaultModel.provider &&
          old.settings?.modelId === firstChatScenarioDefaultModel.modelId
        ) {
          return old
        }
        return {
          ...old,
          settings: {
            ...(old.settings || {}),
            ...firstChatScenarioDefaultModel,
          },
        }
      }
      if (old.settings?.provider && old.settings?.modelId) {
        return old
      }
      const defaultModel = defaultChatModel
        ? {
            provider: defaultChatModel.provider,
            modelId: defaultChatModel.model,
          }
        : undefined
      if (!defaultModel) {
        return old
      }
      return {
        ...old,
        settings: {
          ...(old.settings || {}),
          ...defaultModel,
        },
      }
    })
  }, [
    defaultChatModel,
    hasCompletedFirstSuccessfulChat,
    hasExpiredLicense,
    isLoggedIn,
    licenseDetail,
    licenseKey,
    licensePlanName,
  ])

  const createPersistedChatSession = useCallback(
    async (options?: {
      name?: string
      threadName?: string
      messages?: Session['messages']
      settingsPatch?: Partial<SessionSettings>
      settingsOverride?: Partial<SessionSettings>
    }) => {
      const newSession = await createSessionStore({
        name: options?.name ?? session.name,
        type: 'chat',
        assistantAvatarKey: session.assistantAvatarKey,
        picUrl: session.picUrl,
        backgroundImage: session.backgroundImage,
        messages: options?.messages ?? session.messages,
        threadName: options?.threadName,
        settings: {
          ...session.settings,
          ...options?.settingsPatch,
          ...(sessionAgentModeMap.new ? { agentMode: sessionAgentModeMap.new } : {}),
          // Working directories bound while the chat was still "new" (not yet persisted).
          ...(newSessionState.workingDirectories?.length
            ? { workingDirectories: newSessionState.workingDirectories }
            : {}),
          ...(newSessionState.agentFullAccess ? { agentFullAccess: true } : {}),
          ...options?.settingsOverride,
        },
      })

      // Transfer knowledge base / Work Mode settings from newSessionState to the actual
      // session, then clear it so nothing bleeds into the next new chat. (workingDirectories
      // and agentFullAccess are already baked into the created session's settings above;
      // this only clears them.)
      if (newSessionState.knowledgeBase) {
        addSessionKnowledgeBase(newSession.id, newSessionState.knowledgeBase)
      }
      if (
        newSessionState.knowledgeBase ||
        newSessionState.workingDirectories?.length ||
        newSessionState.agentFullAccess
      ) {
        setNewSessionState({})
      }

      // Transfer web browsing setting from "new" session to the actual session
      const newSessionWebBrowsing = sessionWebBrowsingMap.new
      if (newSessionWebBrowsing !== undefined) {
        setSessionWebBrowsing(newSession.id, newSessionWebBrowsing)
        clearSessionWebBrowsing('new')
      }

      // Transfer agent mode setting from "new" session to the actual session
      if (sessionAgentModeMap.new) {
        clearSessionAgentMode('new')
      }

      switchCurrentSession(newSession.id)
      localStorage.removeItem('new-chat')

      return newSession
    },
    [
      session,
      addSessionKnowledgeBase,
      newSessionState.knowledgeBase,
      newSessionState.workingDirectories,
      newSessionState.agentFullAccess,
      setNewSessionState,
      sessionWebBrowsingMap,
      setSessionWebBrowsing,
      clearSessionWebBrowsing,
      sessionAgentModeMap,
      clearSessionAgentMode,
    ]
  )

  const handleSubmit = useCallback(
    async ({ constructedMessage, needGenerating = true, onUserMessageReady, settingsPatch }: InputBoxPayload) => {
      const newSession = await createPersistedChatSession({ settingsPatch })

      void submitNewUserMessage(newSession.id, {
        newUserMsg: constructedMessage,
        needGenerating,
        onUserMessageReady,
      })
    },
    [createPersistedChatSession]
  )

  const handleScenarioSelect = useCallback(
    async (scenario: NewUserScenario) => {
      const scenarioContent = resolveNewUserScenarioContent(scenario, i18n.language)
      trackJkClickEvent(JK_EVENTS.LEAD_CHAT_CARD_CLICK, {
        pageName: JK_PAGE_NAMES.CHAT_PAGE,
        content: t(scenario.titleKey),
        contentType: session.settings?.modelId ?? firstChatScenarioDefaultModel.modelId,
      })
      const assistantMessage = createMessage('assistant', '')
      assistantMessage.generating = true
      const newSession = await createPersistedChatSession({
        name: scenarioContent.sessionTitle,
        threadName: scenarioContent.sessionTitle,
        messages: [
          createMessage('system', scenarioContent.systemPrompt),
          createMessage('user', scenarioContent.firstUserMessage),
          assistantMessage,
        ],
        settingsOverride: { agentMode: scenarioAgentModeOff },
      })

      void generate(newSession.id, assistantMessage, { operationType: 'send_message' })
    },
    [createPersistedChatSession, i18n.language, session.settings?.modelId, t]
  )

  const onSelectModel = useCallback((p: string, m: string) => {
    hasUserSelectedModelRef.current = true
    setSession((old) => ({
      ...old,
      settings: {
        ...(old.settings || {}),
        provider: p,
        modelId: m,
      },
    }))
  }, [])

  const onClickSessionSettings = useCallback(async () => {
    const res: Session = await NiceModal.show('session-settings', {
      session,
      disableAutoSave: true,
    })
    if (res) {
      setSession((old) => ({
        ...old,
        ...res,
      }))
    }
    return true
  }, [session])

  const showNewUserScenarios =
    forceShowNewUserScenarioCards || (hasCompletedFirstSuccessfulChat === false && isLoggedIn)

  return (
    <Page title="">
      <div className="p-0 flex flex-col h-full min-h-0 overflow-hidden">
        <div className={clsx('min-h-0 flex-1 overflow-y-auto', 'pb-md')}>
          {showNewUserScenarios ? (
            <Stack justify="center" className="min-h-full" py="xl">
              <NewUserScenarioGrid scenarios={newUserScenarios} onSelect={handleScenarioSelect} />
            </Stack>
          ) : (
            <Stack align="center" justify="center" gap="sm" className="min-h-full">
              <HomepageIcon className="h-8" />
              <Text fw="600" size={isSmallScreen ? 'sm' : 'md'}>
                {t('What can I help you with today?')}
              </Text>
            </Stack>
          )}
        </div>

        <Stack gap="sm" className="shrink-0">
          <Box className="relative">
            <InputBox
              sessionType="chat"
              sessionId="new"
              model={selectedModel}
              // fullWidth
              onSelectModel={onSelectModel}
              onClickSessionSettings={onClickSessionSettings}
              onSubmit={handleSubmit}
            />
          </Box>
        </Stack>
      </div>
    </Page>
  )
}

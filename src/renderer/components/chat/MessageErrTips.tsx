import { ActionIcon, Flex, Text } from '@mantine/core'
import { IconCheck, IconChevronDown, IconChevronUp, IconCopy, IconReload } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCopied } from '@/hooks/useCopied'
import { useLanguage, useSettingsStore } from '@/stores/settingsStore'
import LinkTargetBlank from '../common/Link'
import { QuotaExhaustedCard } from './QuotaExhaustedCard'
import { resolveMessageErrorPresentation } from './message-error-presentation'

const MAX_CHARS = 200
const MAX_LINES = 3

/**
 * Detect HTML content in error messages (e.g., gateway error pages).
 */
function isHtmlContent(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase()
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')
}

/**
 * i18n keys for common HTTP status code errors.
 * These provide user-friendly, translatable messages for server errors.
 */
const httpStatusCodeI18nKeys: Record<number, string> = {
  401: 'HTTP error: Unauthorized (401). Your authentication credentials are invalid or have expired. Please check your API key or login status.',
  403: 'HTTP error: Forbidden (403). You do not have permission to access this resource. Please check your API key permissions or account status.',
  408: 'HTTP error: Request Timeout (408). The server took too long to respond. Please try again later.',
  429: 'HTTP error: Too Many Requests (429). The service is currently experiencing high demand or resource limitations. Please wait a moment and try again.',
  500: 'HTTP error: Internal Server Error (500). The server encountered an unexpected error. Please try again later.',
  502: 'HTTP error: Bad Gateway (502). The server received an invalid response from the upstream service. This is usually a temporary issue, please try again later.',
  503: 'HTTP error: Service Unavailable (503). The server is temporarily unavailable, possibly due to maintenance or overload. Please try again later.',
  504: 'HTTP error: Gateway Timeout (504). The server did not receive a timely response from the upstream service. This is usually a temporary issue, please try again later.',
}

/**
 * Extract HTTP status code from error message or errorExtra.
 */
function getHttpStatusCode(msg: Message): number | undefined {
  // First check errorExtra.httpStatusCode (set by our request layer)
  const extraCode = msg.errorExtra?.['httpStatusCode']
  if (typeof extraCode === 'number' && extraCode >= 400) {
    return extraCode
  }
  // Fallback: parse from error message like "API Error: Status Code 504, ..."
  const match = msg.error?.match(/Status Code (\d{3})/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return undefined
}

function getRequestId(msg: Message): string | undefined {
  const requestId = msg.errorExtra?.['requestId']
  if (typeof requestId !== 'string' || requestId.length === 0) {
    return undefined
  }
  const uniqueRequestIds = [
    ...new Set(
      requestId
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ]
  return uniqueRequestIds.length > 0 ? uniqueRequestIds.join(', ') : undefined
}

function shouldTruncate(text: string): boolean {
  if (text.length > MAX_CHARS) return true
  const lineCount = text.split('\n').length
  return lineCount > MAX_LINES
}

function getTruncatedText(text: string): string {
  if (text.length > MAX_CHARS) {
    return `${text.slice(0, MAX_CHARS)}...`
  }
  const lines = text.split('\n')
  if (lines.length > MAX_LINES) {
    return `${lines.slice(0, MAX_LINES).join('\n')}...`
  }
  return text
}

/**
 * Detects if an error message indicates a context length exceeded error from various AI providers.
 */
export function isContextLengthError(errorText: string | null | undefined): boolean {
  if (!errorText) return false
  const text = errorText.toLowerCase()

  if (text.includes('context_length_exceeded')) return true
  if (text.includes('prompt is too long')) return true
  if (text.includes('maximum context length')) return true
  if (text.includes('input token limit')) return true
  if (text.includes('token') && text.includes('exceed') && text.includes('limit')) return true
  if (text.includes('exceed') && text.includes('max_prompt_tokens')) return true

  return false
}

export default function MessageErrTips(props: {
  msg: Message
  sessionId?: string
  onRetry?: () => void | Promise<void>
  isBubbleLayout?: boolean
}) {
  const { msg, sessionId, onRetry, isBubbleLayout } = props
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const licenseKey = useSettingsStore((state) => state.licenseKey)
  const language = useLanguage()
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isHandlingAgentModeReward, setIsHandlingAgentModeReward] = useState(false)
  const [agentModeRewardClaimFailed, setAgentModeRewardClaimFailed] = useState(false)
  const [agentModeRewardClaimed, setAgentModeRewardClaimed] = useState(false)
  const [agentModeRewardResumeFailed, setAgentModeRewardResumeFailed] = useState(false)

  const errorMessage = msg.errorExtra?.responseBody
    ? (() => {
        const body = String(msg.errorExtra.responseBody)
        // Don't display raw HTML error pages (e.g., 502/503/504 gateway errors)
        if (isHtmlContent(body)) {
          return msg.error || 'The server returned an error page. Please try again later.'
        }
        try {
          const json = JSON.parse(body)
          return JSON.stringify(json, null, 2)
        } catch {
          return body
        }
      })()
    : msg.error || ''

  // Reset translation when the underlying error changes (e.g. after retry)
  useEffect(() => {
    setTranslatedText(null)
  }, [errorMessage])

  const displayedErrorMessage = translatedText ?? errorMessage
  const requestId = getRequestId(msg)
  const { copied, copy } = useCopied(displayedErrorMessage)
  const isTruncated = shouldTruncate(errorMessage)
  const showTranslateButton = language !== 'en' && errorMessage.length > 0
  const errorPresentation = resolveMessageErrorPresentation(msg)
  const agentModeTrackingContext = useMemo(
    () =>
      sessionId
        ? {
            sessionId,
            mode: 'work_mode' as const,
            provider: msg.aiProvider,
            model: msg.model,
          }
        : null,
    [msg.aiProvider, msg.model, sessionId]
  )

  useEffect(() => {
    if (errorPresentation === 'agent-mode-reward' && agentModeTrackingContext) {
      trackAgentModeFreePointsCard(agentModeTrackingContext)
    }
  }, [agentModeTrackingContext, errorPresentation])

  const handleTranslate = useCallback(async () => {
    if (translatedText) {
      setTranslatedText(null)
      return
    }
    setIsTranslating(true)
    try {
      const [result] = await translateTexts([errorMessage], language, { sourceLang: 'en' })
      setTranslatedText(result ?? null)
    } catch {
      // ignore
    } finally {
      setIsTranslating(false)
    }
  }, [errorMessage, language, translatedText])

  const handleAgentModeRewardAction = useCallback(async () => {
    if (isHandlingAgentModeReward || !onRetry || !licenseKey) {
      return
    }
    if (!agentModeRewardClaimed && agentModeTrackingContext) {
      trackAgentModeFreePointsCardClick(agentModeTrackingContext)
    }
    setIsHandlingAgentModeReward(true)
    setAgentModeRewardClaimFailed(false)
    setAgentModeRewardResumeFailed(false)

    if (agentModeRewardClaimed) {
      try {
        await onRetry()
      } catch (error) {
        console.error('Failed to resume Agent Mode after claiming the reward:', error)
        setAgentModeRewardResumeFailed(true)
        toastActions.add(t('Reward claimed, but the task could not resume automatically. Please retry.'))
      } finally {
        setIsHandlingAgentModeReward(false)
      }
      return
    }

    try {
      await claimAgentModeRewardAndResume({
        claim: () => claimFreeAgentModeReward(licenseKey),
        showSuccess: (reward) => {
          setAgentModeRewardClaimed(true)
          if (agentModeTrackingContext) {
            trackAgentModeFreePointsClaimSuccess(agentModeTrackingContext)
          }
          void NiceModal.show('agent-mode-reward-claim-success', reward).catch(() => undefined)
        },
        resume: async () => {
          await onRetry()
        },
      })
    } catch (error) {
      if (error instanceof AgentModeRewardResumeError) {
        console.error('Failed to resume Agent Mode after claiming the reward:', error.resumeCause)
        setAgentModeRewardClaimed(true)
        setAgentModeRewardResumeFailed(true)
        toastActions.add(t('Reward claimed, but the task could not resume automatically. Please retry.'))
        return
      }
      console.error('Failed to claim Agent Mode reward:', error)
      setAgentModeRewardClaimFailed(true)
    } finally {
      setIsHandlingAgentModeReward(false)
    }
  }, [agentModeRewardClaimed, agentModeTrackingContext, isHandlingAgentModeReward, licenseKey, onRetry, t])

  const handleUpgradePlan = useCallback(() => {
    platform.openLink(
      buildChatboxUrl(`/redirect_app/view_more_plans/${language}?utm_source=app&utm_content=msg_quota_exhausted`)
    )
  }, [language])

  const handleConfigureOcr = useCallback(() => {
    navigateToSettings('/default-models')
  }, [])

  if (!msg.error) {
    return null
  }

  if (
    errorPresentation === 'quota-exhausted' ||
    errorPresentation === 'free-quota-exhausted' ||
    errorPresentation === 'ocr-quota-exhausted' ||
    errorPresentation === 'free-ocr-quota-exhausted'
  ) {
    return (
      <QuotaExhaustedCard kind={errorPresentation} onUpgrade={handleUpgradePlan} onConfigureOcr={handleConfigureOcr} />
    )
  }

  if (errorPresentation === 'agent-mode-reward') {
    return (
      <AgentModeRewardQuotaCard
        loading={isHandlingAgentModeReward}
        claimFailed={agentModeRewardClaimFailed}
        rewardClaimed={agentModeRewardClaimed}
        resumeFailed={agentModeRewardResumeFailed}
        onAction={handleAgentModeRewardAction}
      />
    )
  }

  const httpStatusCode = getHttpStatusCode(msg)
  const errorMsg = msg.error || errorMessage || 'Unknown error'
}

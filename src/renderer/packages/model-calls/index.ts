import type { ModelInterface } from '@shared/models/types'
import type { Message } from '@shared/types'
import { convertToModelMessages } from './message-utils'

export { generateImage } from './generate-image'

export async function generateText(model: ModelInterface, messages: Message[]) {
  try {
    return model.chat(await convertToModelMessages(messages, { modelSupportVision: model.isSupportVision() }), {})
  } catch (e) {
    console.error('generateText error:', e)
    throw new Error('Failed to generate text: ' + (e instanceof Error ? e.message : String(e)))
  }
}

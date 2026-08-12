import type { ModelInterface } from '@shared/models/types'
import type { Message } from '@shared/types'
import { getMessageText } from '@shared/utils/message'
import { createModelDependencies } from '@/adapters'

export async function generateImage(
  model: ModelInterface,
  params: {
    message: Message // 图片并不关注session context，只需要上一条用户消息
    num: number
  },
  callback?: (picBase64: string) => void | Promise<void>
) {
  try {
    const prompt = getMessageText(params.message)

    const dependencies = await createModelDependencies()
    const images = await Promise.all(
      params.message.contentParts
        .filter((c) => c.type === 'image')
        .map(async (c) => ({ imageUrl: await dependencies.storage.getImage(c.storageKey) }))
    )

    return model.paint(
      {
        prompt,
        images,
        num: params.num,
      },
      undefined,
      callback
    )
  } catch (e) {
    console.error('generateImage error:', e)
    throw new Error('Failed to generate image: ' + (e instanceof Error ? e.message : String(e)))
  }
}

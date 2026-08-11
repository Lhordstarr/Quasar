import { describe, expect, test } from 'vitest'
import type { ChatboxAIModelList } from '@/packages/remote'
import { buildChatboxAIGroupViews, modelMatchesSearch } from './chatboxCatalog'

function createCatalog(): ChatboxAIModelList {
  return {
    provider: { id: 'chatbox-ai', name: 'Chatbox AI' },
    license: { plan: 'unknown' },
    groups: [
      {
        id: 'advanced',
        modelIds: ['chatboxai-4', 'gpt-5.5', 'claude-opus-4.8'],
        featuredModelIds: ['chatboxai-4'],
      },
      {
        id: 'basic',
        modelIds: ['chatboxai-3.5', 'deepseek-v4-pro'],
      },
    ],
    models: {
      'chatboxai-4': {
        modelId: 'chatboxai-4',
        modelName: 'Chatbox AI 4',
        access: { available: true },
        costLevel: '',
        description: '',
      },
      'gpt-5.5': {
        modelId: 'gpt-5.5',
        modelName: 'GPT 5.5',
        access: { available: true },
        costLevel: 'high',
        description: '',
      },
      'claude-opus-4.8': {
        modelId: 'claude-opus-4.8',
        modelName: 'Claude Opus 4.8',
        access: { available: true },
        costLevel: 'high',
        description: '',
      },
      'chatboxai-3.5': {
        modelId: 'chatboxai-3.5',
        modelName: 'Chatbox AI 3.5',
        access: { available: true },
        costLevel: '',
        description: '',
      },
      'deepseek-v4-pro': {
        modelId: 'deepseek-v4-pro',
        modelName: 'DeepSeek V4 Pro',
        access: { available: true },
        costLevel: '',
        description: '',
      },
    },
    imageModels: [],
    links: { modelPricing: 'https://chatboxai.app/en/model-pricing' },
  }
}

describe('chatboxCatalog', () => {
  test('shows all models of every group regardless of plan', () => {
    const views = buildChatboxAIGroupViews({
      catalog: createCatalog(),
      search: '',
      collapsedGroupIds: new Set(),
    })

    expect(views[0].modelIds).toEqual(['chatboxai-4', 'gpt-5.5', 'claude-opus-4.8'])
    expect(views[1].modelIds).toEqual(['chatboxai-3.5', 'deepseek-v4-pro'])
    expect(views.map((view) => view.total)).toEqual([3, 2])
  })

  test('collapses groups and preserves total count', () => {
    const views = buildChatboxAIGroupViews({
      catalog: createCatalog(),
      search: '',
      collapsedGroupIds: new Set(['basic']),
    })

    expect(views[1].modelIds).toEqual([])
    expect(views[1].total).toBe(2)
  })

  test('applies modelFilter to visible models and totals', () => {
    const views = buildChatboxAIGroupViews({
      catalog: createCatalog(),
      search: '',
      collapsedGroupIds: new Set(),
      modelFilter: (modelId) => modelId !== 'gpt-5.5',
    })

    expect(views[0].modelIds).toEqual(['chatboxai-4', 'claude-opus-4.8'])
    expect(views[0].total).toBe(2)
  })

  test('matches search against provider, model id, and model name', () => {
    const model = { modelId: 'deepseek-v4-pro', modelName: 'DeepSeek V4 Pro' }
    expect(modelMatchesSearch(model, 'chatbox', 'Chatbox AI')).toBe(true)
    expect(modelMatchesSearch(model, 'v4')).toBe(true)
    expect(modelMatchesSearch(model, 'deepseek')).toBe(true)
    expect(modelMatchesSearch(model, 'missing')).toBe(false)
  })
})

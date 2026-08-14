import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'

export interface ModelOption {
  provider: string
  model: string
  label: string
  efforts?: Array<{ id: string; name: string }>
}

export interface ModelSnapshot {
  current: { provider: string; model: string; reasoningEffort?: string }
  routable: boolean
  options: ModelOption[]
}

type ApiFn = (req: { rpcId: string; payload: unknown }) => Promise<unknown>

function unwrap<T>(res: unknown): T | undefined {
  const r = res as { result?: { ok?: boolean; value?: T } } | undefined
  if (r?.result?.ok === true) return r.result.value
  return undefined
}

async function call(fn: ApiFn | undefined, payload: unknown): Promise<unknown> {
  if (typeof fn !== 'function') throw new Error('apiProxy sessions API unavailable')
  return fn({ rpcId: randomUUID(), payload })
}

export async function loadSessionModels(ctx: Context, sessionId: string): Promise<ModelSnapshot> {
  const api = (ctx as {
    apiProxy?: { sessions?: { models?: ApiFn } }
  }).apiProxy
  const raw = await call(api?.sessions?.models, { sessionId })
  const value = unwrap<{
    current: { provider: string; model: string; reasoningEffort?: string }
    routable: boolean
    groups: Array<{
      id: string
      name: string
      models: Array<{
        id: string
        name: string
        reasoning?: { efforts?: Array<{ id: string; name: string }> }
      }>
    }>
  }>(raw)
  if (!value) throw new Error('failed to load session models')

  const options: ModelOption[] = []
  for (const group of value.groups ?? []) {
    for (const m of group.models ?? []) {
      options.push({
        provider: group.id,
        model: m.id,
        label: `${group.name}/${m.name}`,
        efforts: m.reasoning?.efforts?.map((e) => ({ id: e.id, name: e.name })),
      })
    }
  }

  return {
    current: value.current,
    routable: value.routable,
    options,
  }
}

export async function selectSessionModel(
  ctx: Context,
  sessionId: string,
  selection: { provider: string; model: string; reasoningEffort?: string },
): Promise<{ provider: string; model: string; reasoningEffort?: string }> {
  const api = (ctx as {
    apiProxy?: { sessions?: { selectModel?: ApiFn } }
  }).apiProxy
  const raw = await call(api?.sessions?.selectModel, {
    sessionId,
    provider: selection.provider,
    model: selection.model,
    reasoningEffort: selection.reasoningEffort,
  })
  const value = unwrap<{ selected: { provider: string; model: string; reasoningEffort?: string } }>(raw)
  if (!value?.selected) throw new Error('failed to select model')
  return value.selected
}

export function formatModel(sel: { provider: string; model: string; reasoningEffort?: string }): string {
  const base = `${sel.provider}/${sel.model}`
  return sel.reasoningEffort ? `${base} (${sel.reasoningEffort})` : base
}

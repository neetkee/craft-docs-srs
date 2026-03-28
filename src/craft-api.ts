export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

interface ConnectionInfo {
  space: {
    id: string
    name: string
    timezone: string
    time: string
    friendlyDate: string
  }
}

export interface Collection {
  id: string
  name: string
  itemCount: number
  documentId: string
}

export interface ContentBlock {
  id: string
  type: string
  textStyle: string
  markdown: string
}

export interface CollectionItem {
  id: string
  title: string
  properties: Record<string, string>
  content: ContentBlock[]
}

export async function validateConnection(apiUrl: string, apiKey: string): Promise<Result<ConnectionInfo>> {
  try {
    const res = await fetch(`${apiUrl}/connection`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) {
      const data = (await res.json()) as ConnectionInfo
      return { ok: true, data }
    }
    return { ok: false, error: "Could not connect — check your API key" }
  } catch {
    return { ok: false, error: "Network error — check your API URL" }
  }
}

export interface CraftClient {
  listCollections(): Promise<Result<Collection[]>>
  fetchCollectionItems(collectionId: string): Promise<Result<CollectionItem[]>>
  insertBlock(params: { markdown: string; textStyle: string; color: string; afterBlockId: string }): Promise<Result<string>>
  updateBlock(params: { blockId: string; markdown: string; color: string }): Promise<Result>
}

export function createCraftClient(apiUrl: string, apiKey: string): CraftClient {
  const headers = { Authorization: `Bearer ${apiKey}` }
  const jsonHeaders = { ...headers, "Content-Type": "application/json" }

  return {
    async listCollections() {
      try {
        const res = await fetch(`${apiUrl}/collections`, { headers })
        if (res.ok) {
          const json = (await res.json()) as { items: Collection[] }
          return { ok: true, data: json.items }
        }
        return { ok: false, error: "Failed to fetch collections" }
      } catch {
        return { ok: false, error: "Network error — check your connection" }
      }
    },

    async fetchCollectionItems(collectionId) {
      try {
        const res = await fetch(`${apiUrl}/collections/${collectionId}/items`, { headers })
        if (res.ok) {
          const json = (await res.json()) as { items: CollectionItem[] }
          return { ok: true, data: json.items }
        }
        return { ok: false, error: "Failed to fetch collection items" }
      } catch {
        return { ok: false, error: "Network error — check your connection" }
      }
    },

    async insertBlock(params) {
      try {
        const res = await fetch(`${apiUrl}/blocks`, {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({
            blocks: [{ type: "text", markdown: params.markdown, textStyle: params.textStyle, color: params.color }],
            position: { position: "after", siblingId: params.afterBlockId },
          }),
        })
        if (res.ok) {
          const json = (await res.json()) as { items: Array<{ id: string }> }
          if (!json.items[0]) return { ok: false, error: "API returned empty response" }
          return { ok: true, data: json.items[0].id }
        }
        return { ok: false, error: "Failed to insert block" }
      } catch {
        return { ok: false, error: "Network error — check your connection" }
      }
    },

    async updateBlock(params) {
      try {
        const res = await fetch(`${apiUrl}/blocks`, {
          method: "PUT",
          headers: jsonHeaders,
          body: JSON.stringify({
            blocks: [{ id: params.blockId, markdown: params.markdown, color: params.color }],
          }),
        })
        if (res.ok) return { ok: true, data: undefined }
        return { ok: false, error: "Failed to update block" }
      } catch {
        return { ok: false, error: "Network error — check your connection" }
      }
    },
  }
}

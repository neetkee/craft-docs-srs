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

interface RawCollectionItem {
  id: string
  properties: Record<string, string>
  content: ContentBlock[]
  [key: string]: unknown
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

export interface CollectionSchemaProperty {
  key: string
  name: string
  type: string
  options?: { name: string; color?: string }[]
}

export interface CollectionSchema {
  key: string
  name: string
  contentPropDetails: { key: string; name: string }
  properties: CollectionSchemaProperty[]
}

export interface CraftClient {
  listCollections(): Promise<Result<Collection[]>>
  fetchCollectionItems(collectionId: string): Promise<Result<CollectionItem[]>>
  fetchCollectionSchema(collectionId: string): Promise<Result<CollectionSchema>>
  updateCollectionSchema(collectionId: string, schema: CollectionSchema): Promise<Result>
  updateCollectionItem(collectionId: string, itemId: string, properties: Record<string, string>): Promise<Result>
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
        const schemaRes = await fetch(`${apiUrl}/collections/${collectionId}/schema?format=schema`, { headers })
        if (!schemaRes.ok) return { ok: false, error: "Failed to fetch collection schema" }
        const schema = (await schemaRes.json()) as CollectionSchema
        const titleKey = schema.contentPropDetails.key

        const res = await fetch(`${apiUrl}/collections/${collectionId}/items`, { headers })
        if (!res.ok) return { ok: false, error: "Failed to fetch collection items" }
        const json = (await res.json()) as { items: RawCollectionItem[] }
        const items: CollectionItem[] = json.items.map((item) => ({
          id: item.id,
          title: (item[titleKey] as string) ?? "",
          properties: item.properties,
          content: item.content,
        }))
        return { ok: true, data: items }
      } catch {
        return { ok: false, error: "Network error — check your connection" }
      }
    },

    async fetchCollectionSchema(collectionId) {
      try {
        const res = await fetch(`${apiUrl}/collections/${collectionId}/schema?format=schema`, { headers })
        if (res.ok) {
          const json = (await res.json()) as CollectionSchema
          return { ok: true, data: json }
        }
        return { ok: false, error: "Failed to fetch collection schema" }
      } catch {
        return { ok: false, error: "Network error — check your connection" }
      }
    },

    async updateCollectionSchema(collectionId, schema) {
      try {
        const res = await fetch(`${apiUrl}/collections/${collectionId}/schema`, {
          method: "PUT",
          headers: jsonHeaders,
          body: JSON.stringify({ schema }),
        })
        if (res.ok) return { ok: true, data: undefined }
        return { ok: false, error: "Failed to update collection schema" }
      } catch {
        return { ok: false, error: "Network error — check your connection" }
      }
    },

    async updateCollectionItem(collectionId, itemId, properties) {
      try {
        const res = await fetch(`${apiUrl}/collections/${collectionId}/items`, {
          method: "PUT",
          headers: jsonHeaders,
          body: JSON.stringify({ itemsToUpdate: [{ id: itemId, properties }] }),
        })
        if (res.ok) return { ok: true, data: undefined }
        return { ok: false, error: "Failed to update collection item" }
      } catch {
        return { ok: false, error: "Network error — check your connection" }
      }
    },
  }
}

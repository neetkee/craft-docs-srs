interface ConnectionInfo {
  space: {
    id: string
    name: string
    timezone: string
    time: string
    friendlyDate: string
  }
}

export type ConnectionResult =
  | { ok: true; data: ConnectionInfo }
  | { ok: false; error: string }

export interface Collection {
  id: string
  name: string
  itemCount: number
  documentId: string
}

export type CollectionsResult =
  | { ok: true; data: Collection[] }
  | { ok: false; error: string }

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

export type CollectionItemsResult =
  | { ok: true; data: CollectionItem[] }
  | { ok: false; error: string }

export async function fetchCollectionItems(
  apiUrl: string,
  apiKey: string,
  collectionId: string,
): Promise<CollectionItemsResult> {
  try {
    const res = await fetch(`${apiUrl}/collections/${collectionId}/items`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) {
      const json = (await res.json()) as { items: CollectionItem[] }
      return { ok: true, data: json.items }
    }
    return { ok: false, error: "Failed to fetch collection items" }
  } catch {
    return { ok: false, error: "Network error — check your connection" }
  }
}

export async function listCollections(apiUrl: string, apiKey: string): Promise<CollectionsResult> {
  try {
    const res = await fetch(`${apiUrl}/collections`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) {
      const json = (await res.json()) as { items: Collection[] }
      return { ok: true, data: json.items }
    }
    return { ok: false, error: "Failed to fetch collections" }
  } catch {
    return { ok: false, error: "Network error — check your connection" }
  }
}

export type InsertBlockResult =
  | { ok: true; data: string }
  | { ok: false; error: string }

export async function insertBlock(
  apiUrl: string,
  apiKey: string,
  params: { markdown: string; textStyle: string; color: string; afterBlockId: string },
): Promise<InsertBlockResult> {
  try {
    const res = await fetch(`${apiUrl}/blocks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [{ type: "text", markdown: params.markdown, textStyle: params.textStyle, color: params.color }],
        position: { position: "after", siblingId: params.afterBlockId },
      }),
    })
    if (res.ok) {
      const json = (await res.json()) as { items: Array<{ id: string }> }
      return { ok: true, data: json.items[0].id }
    }
    return { ok: false, error: "Failed to insert block" }
  } catch {
    return { ok: false, error: "Network error — check your connection" }
  }
}

export type UpdateBlockResult =
  | { ok: true }
  | { ok: false; error: string }

export async function updateBlock(
  apiUrl: string,
  apiKey: string,
  params: { blockId: string; markdown: string; color: string },
): Promise<UpdateBlockResult> {
  try {
    const res = await fetch(`${apiUrl}/blocks`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [{ id: params.blockId, markdown: params.markdown, color: params.color }],
      }),
    })
    if (res.ok) return { ok: true }
    return { ok: false, error: "Failed to update block" }
  } catch {
    return { ok: false, error: "Network error — check your connection" }
  }
}

export async function validateConnection(apiUrl: string, apiKey: string): Promise<ConnectionResult> {
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

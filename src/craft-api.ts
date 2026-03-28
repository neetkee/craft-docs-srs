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

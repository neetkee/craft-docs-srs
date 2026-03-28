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

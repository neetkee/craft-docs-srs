import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test"
import { validateConnection, createCraftClient } from "./craft-api"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_URL = "https://craft.test"
const API_KEY = "test-api-key"

let fetchSpy: ReturnType<typeof spyOn>

function mockFetch(response: { ok: boolean; json?: () => Promise<unknown>; status?: number }) {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(response as Response)
}

function mockFetchError(error: Error) {
  fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(error)
}

afterEach(() => {
  fetchSpy?.mockRestore()
})

// ---------------------------------------------------------------------------
// validateConnection
// ---------------------------------------------------------------------------

describe("validateConnection", () => {
  it("returns connection info on success", async () => {
    const connectionInfo = { space: { id: "s1", name: "My Space", timezone: "UTC", time: "12:00", friendlyDate: "Today" } }
    mockFetch({ ok: true, json: () => Promise.resolve(connectionInfo) })

    const result = await validateConnection(API_URL, API_KEY)

    expect(result).toEqual({ ok: true, data: connectionInfo })
    expect(fetchSpy).toHaveBeenCalledWith(`${API_URL}/connection`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
  })

  it("returns error on non-ok response", async () => {
    mockFetch({ ok: false, status: 401 })

    const result = await validateConnection(API_URL, API_KEY)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("API key")
  })

  it("returns error on network failure", async () => {
    mockFetchError(new Error("ECONNREFUSED"))

    const result = await validateConnection(API_URL, API_KEY)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Network error")
  })
})

// ---------------------------------------------------------------------------
// createCraftClient — listCollections
// ---------------------------------------------------------------------------

describe("createCraftClient.listCollections", () => {
  it("returns collections on success", async () => {
    const collections = [{ id: "c1", name: "Deck 1", itemCount: 5, documentId: "d1" }]
    mockFetch({ ok: true, json: () => Promise.resolve({ items: collections }) })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.listCollections()

    expect(result).toEqual({ ok: true, data: collections })
    expect(fetchSpy).toHaveBeenCalledWith(`${API_URL}/collections`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
  })

  it("returns error on HTTP failure", async () => {
    mockFetch({ ok: false, status: 500 })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.listCollections()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Failed to fetch collections")
  })

  it("returns error on network failure", async () => {
    mockFetchError(new Error("timeout"))

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.listCollections()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Network error")
  })
})

// ---------------------------------------------------------------------------
// createCraftClient — fetchCollectionItems
// ---------------------------------------------------------------------------

describe("createCraftClient.fetchCollectionItems", () => {
  const schema = { key: "c1", name: "Deck", contentPropDetails: { key: "title", name: "Title" }, properties: [] }

  it("returns items on success", async () => {
    const rawItems = [{ id: "i1", title: "Item 1", properties: {}, content: [] }]
    fetchSpy = spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(schema) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: rawItems }) } as Response)

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.fetchCollectionItems("c1")

    expect(result).toEqual({ ok: true, data: rawItems })
    expect(fetchSpy).toHaveBeenNthCalledWith(1, `${API_URL}/collections/c1/schema?format=schema`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(fetchSpy).toHaveBeenNthCalledWith(2, `${API_URL}/collections/c1/items`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
  })

  it("maps title from contentPropDetails key", async () => {
    const customSchema = { key: "c1", name: "Deck", contentPropDetails: { key: "not_a_title", name: "Not a title" }, properties: [] }
    const rawItems = [{ id: "i1", not_a_title: "Item 1", properties: {}, content: [] }]
    fetchSpy = spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(customSchema) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: rawItems }) } as Response)

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.fetchCollectionItems("c1")

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data[0].title).toBe("Item 1")
  })

  it("returns error when schema fetch fails", async () => {
    mockFetch({ ok: false, status: 500 })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.fetchCollectionItems("c1")

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Failed to fetch collection schema")
  })

  it("returns error when items fetch fails", async () => {
    fetchSpy = spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(schema) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response)

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.fetchCollectionItems("c1")

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Failed to fetch collection items")
  })

  it("returns error on network failure", async () => {
    mockFetchError(new Error("DNS"))

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.fetchCollectionItems("c1")

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Network error")
  })
})

// ---------------------------------------------------------------------------
// createCraftClient — fetchCollectionSchema
// ---------------------------------------------------------------------------

describe("createCraftClient.fetchCollectionSchema", () => {
  it("returns schema on success", async () => {
    const schema = { key: "tasks", name: "Tasks", contentPropDetails: { key: "title", name: "Title" }, properties: [] }
    mockFetch({ ok: true, json: () => Promise.resolve(schema) })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.fetchCollectionSchema("c1")

    expect(result).toEqual({ ok: true, data: schema })
    expect(fetchSpy).toHaveBeenCalledWith(`${API_URL}/collections/c1/schema?format=schema`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
  })

  it("returns error on HTTP failure", async () => {
    mockFetch({ ok: false, status: 500 })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.fetchCollectionSchema("c1")

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Failed to fetch collection schema")
  })

  it("returns error on network failure", async () => {
    mockFetchError(new Error("offline"))

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.fetchCollectionSchema("c1")

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Network error")
  })
})

// ---------------------------------------------------------------------------
// createCraftClient — updateCollectionSchema
// ---------------------------------------------------------------------------

describe("createCraftClient.updateCollectionSchema", () => {
  const schema = { key: "tasks", name: "Tasks", contentPropDetails: { key: "title", name: "Title" }, properties: [{ key: "srs", name: "SRS", type: "text" }] }

  it("returns ok on success", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({}) })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.updateCollectionSchema("c1", schema)

    expect(result).toEqual({ ok: true, data: undefined })
    expect(fetchSpy).toHaveBeenCalledWith(`${API_URL}/collections/c1/schema`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ schema }),
    })
  })

  it("returns error on HTTP failure", async () => {
    mockFetch({ ok: false, status: 500 })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.updateCollectionSchema("c1", schema)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Failed to update collection schema")
  })

  it("returns error on network failure", async () => {
    mockFetchError(new Error("offline"))

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.updateCollectionSchema("c1", schema)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Network error")
  })
})

// ---------------------------------------------------------------------------
// createCraftClient — updateCollectionItem
// ---------------------------------------------------------------------------

describe("createCraftClient.updateCollectionItem", () => {
  it("returns ok on success", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({}) })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.updateCollectionItem("c1", "item-1", { srs: "REVIEW|0|5|4|100|100|1|0|1" })

    expect(result).toEqual({ ok: true, data: undefined })
    expect(fetchSpy).toHaveBeenCalledWith(`${API_URL}/collections/c1/items`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ itemsToUpdate: [{ id: "item-1", properties: { srs: "REVIEW|0|5|4|100|100|1|0|1" } }] }),
    })
  })

  it("returns error on HTTP failure", async () => {
    mockFetch({ ok: false, status: 500 })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.updateCollectionItem("c1", "item-1", { srs: "test" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Failed to update collection item")
  })

  it("returns error on network failure", async () => {
    mockFetchError(new Error("offline"))

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.updateCollectionItem("c1", "item-1", { srs: "test" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Network error")
  })
})

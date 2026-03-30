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
  it("returns items on success", async () => {
    const items = [{ id: "i1", title: "Item 1", properties: {}, content: [] }]
    mockFetch({ ok: true, json: () => Promise.resolve({ items }) })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.fetchCollectionItems("c1")

    expect(result).toEqual({ ok: true, data: items })
    expect(fetchSpy).toHaveBeenCalledWith(`${API_URL}/collections/c1/items`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
  })

  it("returns error on HTTP failure", async () => {
    mockFetch({ ok: false, status: 404 })

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
// createCraftClient — insertBlock
// ---------------------------------------------------------------------------

describe("createCraftClient.insertBlock", () => {
  const params = { markdown: "test content", textStyle: "caption", color: "#ccc", afterBlockId: "b1" }

  it("returns new block id on success", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ items: [{ id: "new-block-1" }] }) })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.insertBlock(params)

    expect(result).toEqual({ ok: true, data: "new-block-1" })
    expect(fetchSpy).toHaveBeenCalledWith(`${API_URL}/blocks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [{ type: "text", markdown: params.markdown, textStyle: params.textStyle, color: params.color }],
        position: { position: "after", siblingId: params.afterBlockId },
      }),
    })
  })

  it("returns error when API returns empty items", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ items: [] }) })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.insertBlock(params)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("empty response")
  })

  it("returns error on HTTP failure", async () => {
    mockFetch({ ok: false, status: 500 })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.insertBlock(params)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Failed to insert block")
  })

  it("returns error on network failure", async () => {
    mockFetchError(new Error("offline"))

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.insertBlock(params)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Network error")
  })
})

// ---------------------------------------------------------------------------
// createCraftClient — updateBlock
// ---------------------------------------------------------------------------

describe("createCraftClient.updateBlock", () => {
  const params = { blockId: "b1", markdown: "updated content", color: "#ddd" }

  it("returns ok on success", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({}) })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.updateBlock(params)

    expect(result).toEqual({ ok: true, data: undefined })
    expect(fetchSpy).toHaveBeenCalledWith(`${API_URL}/blocks`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [{ id: params.blockId, markdown: params.markdown, color: params.color }],
      }),
    })
  })

  it("returns error on HTTP failure", async () => {
    mockFetch({ ok: false, status: 500 })

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.updateBlock(params)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Failed to update block")
  })

  it("returns error on network failure", async () => {
    mockFetchError(new Error("offline"))

    const client = createCraftClient(API_URL, API_KEY)
    const result = await client.updateBlock(params)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("Network error")
  })
})

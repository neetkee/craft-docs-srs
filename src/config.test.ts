import { describe, it, expect } from "bun:test"
import { isConfigComplete } from "./config"
import type { Config } from "./config"

// ---------------------------------------------------------------------------
// isConfigComplete
// ---------------------------------------------------------------------------

describe("isConfigComplete", () => {
  it("returns false for null", () => {
    expect(isConfigComplete(null)).toBe(false)
  })

  it("returns false when craftApiUrl is empty", () => {
    const config: Config = { craftApiUrl: "", craftApiKey: "key", spaceId: "s1", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns false when craftApiKey is empty", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "", spaceId: "s1", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns false when craftApiUrl is whitespace only", () => {
    const config: Config = { craftApiUrl: "   ", craftApiKey: "key", spaceId: "s1", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns false when craftApiKey is whitespace only", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "  \t  ", spaceId: "s1", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns false when spaceId is empty", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "key", spaceId: "", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns false when spaceId is whitespace only", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "key", spaceId: "   ", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns true when url, key, and spaceId are non-empty", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "my-key", spaceId: "s1", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(true)
  })

  it("returns true regardless of collectionIds", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "key", spaceId: "s1", collectionIds: ["c1", "c2"] }
    expect(isConfigComplete(config)).toBe(true)
  })
})


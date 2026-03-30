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
    const config: Config = { craftApiUrl: "", craftApiKey: "key", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns false when craftApiKey is empty", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns false when craftApiUrl is whitespace only", () => {
    const config: Config = { craftApiUrl: "   ", craftApiKey: "key", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns false when craftApiKey is whitespace only", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "  \t  ", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(false)
  })

  it("returns true when both url and key are non-empty", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "my-key", collectionIds: [] }
    expect(isConfigComplete(config)).toBe(true)
  })

  it("returns true regardless of collectionIds", () => {
    const config: Config = { craftApiUrl: "https://example.com", craftApiKey: "key", collectionIds: ["c1", "c2"] }
    expect(isConfigComplete(config)).toBe(true)
  })
})

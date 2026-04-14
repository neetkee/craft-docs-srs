import { homedir } from "node:os"
import { join, dirname } from "node:path"
import { mkdirSync, readFileSync, existsSync } from "node:fs"

export interface Config {
  craftApiUrl: string
  craftApiKey: string
  spaceId: string
  collectionIds: string[]
  maxNewCardsPerDay?: number
}

export const DEFAULT_MAX_NEW_CARDS_PER_DAY = 20

export function getMaxNewCardsPerDay(config: Config): number {
  return config.maxNewCardsPerDay ?? DEFAULT_MAX_NEW_CARDS_PER_DAY
}

function getConfigDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming")
    return join(appData, "craft-docs-srs")
  }
  return join(homedir(), ".config", "craft-docs-srs")
}

export const CONFIG_PATH = join(getConfigDir(), "config.json")

export function loadConfig(): Config | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null
    const text = readFileSync(CONFIG_PATH, "utf-8")
    return JSON.parse(text) as Config
  } catch {
    return null
  }
}

export function isConfigComplete(config: Config | null): boolean {
  if (!config) return false
  return config.craftApiUrl.trim().length > 0 && config.craftApiKey.trim().length > 0 && config.spaceId.trim().length > 0
}

export async function saveConfig(config: Config): Promise<void> {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true })
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2))
}

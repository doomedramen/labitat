import yaml from "js-yaml"
import fs from "fs"
import path from "path"

export type AppConfig = {
  auth: {
    email: string
    passwordHash: string
  }
}

let _config: AppConfig | null = null

export function loadConfig(): AppConfig {
  if (_config) return _config

  // Allow override via environment variable (useful for tests)
  const configPath = process.env.CONFIG_PATH
    ? path.join(process.cwd(), process.env.CONFIG_PATH)
    : path.join(process.cwd(), "config.yaml")

  try {
    const raw = fs.readFileSync(configPath, "utf-8")
    _config = yaml.load(raw) as AppConfig
    return _config
  } catch {
    // Config file doesn't exist yet - user needs to set up config.yaml
    // This is expected on first run; the app should guide user to create config
    throw new Error(
      "config.yaml not found. Please create config.yaml with auth settings. " +
        "See config.yaml.example for reference."
    )
  }
}

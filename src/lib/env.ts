import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    SECRET_KEY:
      process.env.NODE_ENV === "production"
        ? z.string().min(32)
        : z.string().min(32).optional(),
    DATABASE_URL: z.string().default("file:./data/labitat.db"),
    CACHE_DIR: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_ALLOWED_DEV_ORIGINS: z.string().default(""),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SECRET_KEY: process.env.SECRET_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    CACHE_DIR: process.env.CACHE_DIR,
    NEXT_PUBLIC_ALLOWED_DEV_ORIGINS:
      process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS,
  },
})

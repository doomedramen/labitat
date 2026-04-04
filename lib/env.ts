import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod/v4"

export const env = createEnv({
  server: {
    SECRET_KEY: z.string().min(32),
    DATABASE_URL: z.string().default("file:./data/labitat.db"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3000),
    CACHE_DIR: z.string().optional(),
  },
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
})

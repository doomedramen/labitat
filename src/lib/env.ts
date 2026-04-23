import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SECRET_KEY:
      process.env.NODE_ENV === "production" ? z.string().min(32) : z.string().min(32).optional(),
    DATABASE_URL: z.string().default("file:./data/labitat.db"),
    CACHE_DIR: z.string().optional(),
    IDLE_POLLING_ENABLED: z.boolean().default(true),
    IDLE_POLLING_INTERVAL_MINUTES: z.number().min(1).max(60).default(5),
    STARTUP_WARMUP_ENABLED: z.boolean().default(true),
  },
  client: {
    NEXT_PUBLIC_ALLOWED_DEV_ORIGINS: z.string().default(""),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SECRET_KEY: process.env.SECRET_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    CACHE_DIR: process.env.CACHE_DIR,
    NEXT_PUBLIC_ALLOWED_DEV_ORIGINS: process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS,
    IDLE_POLLING_ENABLED: process.env.IDLE_POLLING_ENABLED === "true",
    IDLE_POLLING_INTERVAL_MINUTES: process.env.IDLE_POLLING_INTERVAL_MINUTES
      ? parseInt(process.env.IDLE_POLLING_INTERVAL_MINUTES, 10)
      : 5,
    STARTUP_WARMUP_ENABLED: process.env.STARTUP_WARMUP_ENABLED === "true",
  },
});

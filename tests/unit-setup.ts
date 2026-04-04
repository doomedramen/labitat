// Setup file for unit tests
// Provides mock environment variables before t3-env validates them

process.env.SECRET_KEY = "test-secret-key-that-is-at-least-32-characters-long!"
process.env.DATABASE_URL = "file:./data/labitat.test.db"
;(process.env as Record<string, string>).NODE_ENV = "test"
process.env.PORT = "3001"

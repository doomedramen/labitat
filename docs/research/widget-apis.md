# Widget API research

Researched 2026-10-29. Primary upstream sources below describe upstream branches; instance versions still need verification.

## Stash — verified

- Endpoint: `POST /graphql`, JSON body with a `query` string. [Server endpoint and GraphQL transport](https://github.com/stashapp/stash/blob/develop/internal/api/server.go).
- Authentication: `ApiKey` request header. The session implementation also accepts an `apikey` query parameter; use the header to avoid placing credentials in URLs. [Session source](https://github.com/stashapp/stash/blob/develop/pkg/session/session.go).
- Query: `query { stats { scene_count image_count gallery_count performer_count studio_count tag_count scenes_size } }`.
- Response: GraphQL envelope `data.stats`; counts are non-null integers and `scenes_size` is a non-null float representing the accumulated scene file size. Handle `errors` even when HTTP status is 200. [Stats schema](https://github.com/stashapp/stash/blob/develop/graphql/schema/types/stats.graphql), [query schema](https://github.com/stashapp/stash/blob/develop/graphql/schema/schema.graphql).
- Do not request scene/performer records just to count them: the stats query supplies aggregate values directly.

## Norish — verified

[Official API reference](https://docs.norish.dev/reference/api/) verified 2026-10-29:

- Authentication: `x-api-key` header; create keys under Settings → User → API keys.
- `POST /api/v1/recipes/search` with `{ "cursor": 0, "limit": 1 }` returns `{ recipes: [], total: integer, nextCursor: integer | null }`. Use total, not the page length.
- `GET /api/v1/groceries` returns an array with boolean `isDone`; count done and pending separately.
- `GET /api/v1/planned-recipes/today` returns an array with `id` and `recipeName`. Today is defined in the Norish server timezone.
- All three operations read data. No mutation routes are used. An older instance lacking the public API reports an error rather than fabricated zeros.

## Bambuddy — initial findings

Bambuddy documents its public REST API through each instance’s `/openapi.json`. API key support exists; verify the exact response models and status routes against upstream source or the instance spec before implementation. [Official documentation](https://wiki.bambuddy.cool/community/bambuddy-mcp/), [official repository](https://github.com/maziggy/bambuddy).

## Calibre Downloader — identification pending

Likely project: [calibrain/calibre-web-automated-book-downloader](https://github.com/calibrain/calibre-web-automated-book-downloader). Verify that this is the user’s deployed service before relying on its API. Exact route/auth/response research remains pending.

## Dockge — initial findings

Dockge is a Compose stack manager, and a stack can contain multiple containers. Total/running container statistics must count containers rather than stacks. The public README does not establish a supported HTTP stats endpoint. Inspect upstream Socket.IO handlers and container enumeration before implementation; do not invent `/api/stats`. [Official repository and FAQ](https://github.com/louislam/dockge).

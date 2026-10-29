# Stash

Displays aggregate counts of scenes, images, galleries, performers, studios, and tags. Polls every 30 seconds, without requesting media titles or images.

Set the instance URL (including any URL base) and an API key from **Settings → Security**. The key can be omitted for instances without authentication. Labitat must be able to reach the instance from its server.

Uses a read-only GraphQL statistics query at `/graphql`. Authentication uses the `ApiKey` header. HTTP failures, GraphQL errors, and malformed statistics are reported as widget errors.

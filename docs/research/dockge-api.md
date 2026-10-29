# Dockge widget API research

Verified 2026-10-29 against `louislam/dockge` master. API is internal Socket.IO 4, rather than a documented REST dashboard endpoint. Upstream uses `socket.io-client ~4.8.1` ([package](https://github.com/louislam/dockge/blob/master/package.json)).

## Important result: total containers is not exposed

Dockge’s reviewed standard events can provide **running containers**, but cannot accurately enumerate **all existing containers including stopped containers**. Neither counting stacks nor parsing Compose YAML supplies that total. Do not implement misleading total-container stats from those sources.

- `dockerStats` executes `docker stats --format json --no-stream` **without `--all`**. It returns running container rows only. [Server method](https://github.com/louislam/dockge/blob/master/backend/dockge-server.ts), [Docker stats reference](https://docs.docker.com/reference/cli/docker/container/stats/).
- `serviceStatusList` executes `docker compose ps --format json` **without `--all`**. It groups returned containers by service, using status `Health || State`. It does not enumerate all stopped containers. [Stack method](https://github.com/louislam/dockge/blob/master/backend/stack.ts), [Compose ps reference](https://docs.docker.com/reference/cli/docker/compose/ps/).
- `stackList` reduces `docker compose ls --all` status strings such as `exited(1), running(1)` to a single stack status code, losing the embedded counts. It also omits standalone non-Compose containers and may omit Dockge’s own unmanaged stack. [Stack enumeration and conversion](https://github.com/louislam/dockge/blob/master/backend/stack.ts).

To satisfy exact total/running counts, use a separately configured read-only Docker metrics endpoint (e.g. Docker `/containers/json?all=true` through an appropriately restricted proxy), or add an upstream Dockge event exposing those counts. Do not enable Dockge’s interactive console just to run arbitrary Docker commands for a widget.

## Socket.IO authentication sequence

1. Connect to the Dockge origin using Socket.IO client 4 (default `/socket.io` path). Register event/error listeners before authenticating; use explicit connection/ack deadlines and disconnect in a finally block.
2. Emit `loginByToken`, token string, ack. Ack success is `{ok:true}`; failures include `{ok:false,msg:"authInvalidToken",msgi18n:true}`. Token is the existing Dockge JWT; password changes invalidate it.
3. Alternatively emit `login`, `{username,password}`, ack. Success `{ok:true,token:"JWT"}`; invalid credentials `{ok:false,msg:"authIncorrectCreds"}`. Accounts with 2FA return `{tokenRequired:true}` when no TOTP is supplied. A permanently configured one-time TOTP cannot support periodic polling, so prefer JWT for an integration with an existing 2FA account.
4. Authentication triggers `afterLogin`, which asynchronously sends stack lists. Auth data is per connection; HTTP Basic auth/API-key headers are not this authentication protocol.

[Login handlers](https://github.com/louislam/dockge/blob/master/backend/socket-handlers/main-socket-handler.ts), [frontend protocol](https://github.com/louislam/dockge/blob/master/frontend/src/mixins/socket.ts).

## Agent event envelope

To call local read-only events:

```js
socket.emit("agent", "", "dockerStats", ack);
socket.emit("agent", "", "requestStackList", ack);
socket.emit("agent", "", "serviceStatusList", stackName, ack);
```

The empty endpoint selects the directly connected server. A configured agent endpoint selects a remote Docker host. Do not silently combine agents into a local host total. [Agent proxy handler](https://github.com/louislam/dockge/blob/master/backend/socket-handlers/agent-proxy-socket-handler.ts).

Server pushes arrive as `socket.on("agent", (eventName, payload) => ...)`, e.g. eventName `stackList` and payload `{ok:true, endpoint:"", stackList:{stackName:{name,status,tags:[],isManagedByDockge,composeFileName,endpoint}}}`. `requestStackList` ack is merely `{ok:true,msg:"Updated",msgi18n:true}`; the actual list is a separate push. [Server emitter/list](https://github.com/louislam/dockge/blob/master/backend/dockge-server.ts).

`dockerStats` ack:

```js
{ ok: true, dockerStats: { containerName: { Name: "containerName", /* docker stats JSON fields */ } } }
```

`serviceStatusList` ack:

```js
{ ok: true, serviceStatusList: { serviceName: [{ name: "containerName", status: "running" }] } }
```

Health may replace state (`healthy`, `unhealthy`, `starting`), so status does not consistently equal `running`. Upstream Docker failures are caught and can become an empty stats map, indistinguishable from zero running containers. Document this upstream limitation. [Docker handlers](https://github.com/louislam/dockge/blob/master/backend/agent-socket-handlers/docker-socket-handler.ts), [collection methods](https://github.com/louislam/dockge/blob/master/backend/stack.ts), [stats method](https://github.com/louislam/dockge/blob/master/backend/dockge-server.ts).

## Avoid `getStack` for counting

It only adds `composeYAML`, `composeENV`, and `primaryHostname` to the summary. It does not add container instances/counts, and retrieving it exposes potentially secret environment values. [Stack serialization](https://github.com/louislam/dockge/blob/master/backend/stack.ts).

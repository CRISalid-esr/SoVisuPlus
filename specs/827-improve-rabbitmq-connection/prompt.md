# Improve RabbitMQ connection

## Issues

1. **Upgrade amqplib** — from `0.10.9` to `2.0.1`; drop `@types/amqplib` (types now bundled).
2. **Reconnect on connection loss** — the listener crashes permanently when the initial TCP connection fails, and has no recovery mechanism when RabbitMQ drops at runtime.
3. **Separate interactive from batch messages** — a new 5th routing-key segment (`.interactive` or `.batch`) distinguishes user-triggered events from bulk ETL loads; the two traffic types must be consumed from separate queues so batch loads cannot stall interactive events.
4. **Nack on failure and dead-letter queues** — failed messages are silently acked and lost; they must be nacked and routed to dead-letter queues.

---

## Issue 1 — Upgrade amqplib

Upgrade `amqplib` from `^0.10.9` to `^2.0.1`. Drop `@types/amqplib` — types are bundled from v1.2.0.

**Breaking change in v2.0.0**: `heartbeat: 0` now disables heartbeats instead of deferring to the server. The codebase does not pass `heartbeat: 0`, so there is no impact.

**Notable additions used by this branch**:

- v1.1.0 — built-in reconnection via recovery options on `connect()` (see Issue 2).
- v1.2.0 — bundled TypeScript types.

---

## Issue 2 — Reconnect on connection loss

### Root cause

The crash sequence seen in production:

```
AMQP connection failed
Host: crisalid-bus, Port: 5672
Error: connect ECONNREFUSED 10.255.1.4:5672
❌ Error during startup: TypeError: Cannot read properties of undefined (reading 'assertQueue')
```

`AmqpConnection.connect()` catches `ECONNREFUSED`, logs it, and **returns normally** without rethrowing. The caller (`listener.ts`) has no way to know the connection failed. It proceeds to call `startAMQPConsumer()`, which calls `connection.consume()`, which crashes immediately trying to call `.assertQueue()` on the still-`undefined` channel.

Two separate problems:

- **Silent failure on initial connect**: `connect()` swallows the error; the listener crashes downstream with a misleading `TypeError` and the process exits entirely.
- **No reconnection on runtime loss**: if RabbitMQ drops after a successful start, the listener has no mechanism to detect the disconnection and reconnect.

Restarting the container fixes the issue only because RabbitMQ is available again by the time the new process boots.

### Spec

Pass a `recovery` object to `connect(amqpUrl, { recovery: { ... } })`. This returns a `RecoveringChannelModel` instead of a plain `ChannelModel`.

- `recovery` options: `{ initialDelay: 2000, maxDelay: 30000, factor: 2, jitter: 0.1 }` — exponential backoff from 2 s to 30 s.
- `recovery.setup(model: ChannelModel)` callback: called by amqplib on every successful (re)connect. Use it to recreate the two channels and re-register the stored `interactiveHandler` and `batchHandler`.
- `RecoveringChannelModel` emits `disconnect` (set `connected = false`, log) and `reconnect-scheduled` (log attempt/delay) events.

`connect()` must not swallow errors. If the initial connection rejects (e.g. bad credentials — a non-transient error), the exception propagates to `listener.ts` and the process exits with a clear error, not a downstream `TypeError`.

**`publish()` during reconnect**: if `publish()` is called while `!this.connected`, enqueue the message in memory and flush once reconnected. Bounded buffer of 100 messages; warn and drop on overflow.

---

## Issue 3 — Separate interactive from batch messages

### Routing key convention

All messages on the `graph` exchange gain a **5th segment**: `.interactive` or `.batch`.

```
# before (4 segments)
event.people.person.created

# after (5 segments)
event.people.person.created.interactive
event.people.person.created.batch
```

Sovisuplus **only emits** interactive messages (all user-triggered actions). It **receives** both.

### Current queue architecture (reference)

The existing `sovisuplus` queue on the `graph` exchange receives:

| Binding key                    | Traffic                         |
| ------------------------------ | ------------------------------- |
| `event.documents.document.*`   | document events from graph      |
| `event.people.person.*`        | person events from graph        |
| `event.structures.structure.*` | research unit events from graph |
| `event.harvestings.*.*`        | harvesting state/result events  |

Outbound messages (user actions) are published to the `graph` exchange with routing keys like `task.documents.document.merge`, consumed by `crisalid-ikg-actions-interactive`.

### New queue architecture

Two queues replace the single `sovisuplus` queue:

| Queue       | Default name             | Binding keys                                                                                                                                                   | Prefetch | Env var                       |
| ----------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------- |
| Interactive | `sovisuplus-interactive` | `event.people.person.*.interactive`, `event.structures.structure.*.interactive`, `event.documents.document.*.interactive`, `event.harvestings.*.*.interactive` | 5        | `AMQP_INTERACTIVE_QUEUE_NAME` |
| Batch       | `sovisuplus-batch`       | `event.people.person.*.batch`, `event.structures.structure.*.batch`, `event.documents.document.*.batch`, `event.harvestings.*.*.batch`                         | 20       | `AMQP_BATCH_QUEUE_NAME`       |

Both queues: `durable: true`, `x-consumer-timeout: 43200000` (matching the current `sovisuplus` queue). Sovisuplus asserts both queues at startup via `assertQueue` — no manual pre-creation required.

The `definitions.sample.json` in `crisalid-deployment` must be updated separately to replace the `sovisuplus` queue and its bindings with the two new ones.

### `AmqpConnection` changes

Replace the single `channel` with two named channels: `interactiveChannel` and `batchChannel`, both created from the same connection.

Expose:

- `consumeInteractive(messageHandler)` — asserts `sovisuplus-interactive`, binds it, starts consuming; stores `messageHandler` for reconnect replay.
- `consumeBatch(messageHandler)` — asserts `sovisuplus-batch`, binds it, starts consuming; stores `messageHandler` for reconnect replay.

The existing `consume()` method is removed.

`publish()` always appends `.interactive` to the routing key — sovisuplus only emits interactive messages and callers must not need to know about the suffix convention.

### `startAMQPConsumer` changes

Call both `consumeInteractive` and `consumeBatch` with the same message processing handler. Each gets its **own semaphore** in `listener.ts` (concurrency 1 each), so a slow batch message cannot delay an interactive one.

### Env vars

Add to `.env.sample` and `docs/installation.md`:

- `AMQP_INTERACTIVE_QUEUE_NAME` (default: `sovisuplus-interactive`)
- `AMQP_BATCH_QUEUE_NAME` (default: `sovisuplus-batch`)

Remove `AMQP_QUEUE_NAME`.

---

## Issue 4 — Nack on failure and dead-letter queues

### Problem

Workers (`PersonWorker`, `DocumentWorker`, etc.) correctly throw on failure. But `startAMQPConsumer` swallows the error in a `catch` block, so `AmqpConnection` always calls `channel.ack()` — failed messages are silently lost.

### Spec

**Rename**: `handleIncomingNotification` → `messageHandler` everywhere (`AmqpConnection`, `startAMQPConsumer`, type alias).

**Handler type**: `(content: string) => Promise<void>`. The handler resolves on success and throws on failure — it has no knowledge of AMQP primitives.

**Ack/nack ownership**: `AmqpConnection` owns the try/catch around the handler call. Both `consumeInteractive` and `consumeBatch` follow the same pattern:

```ts
await channel.consume(queueName, async (message) => {
  if (!message) return
  try {
    await messageHandler(message.content.toString())
    channel.ack(message)
  } catch {
    channel.nack(message, false, false) // requeue: false → routed to DLQ
  }
})
```

**`startAMQPConsumer`**: remove the `try/catch` that was swallowing errors. The handler rethrows so `AmqpConnection` can nack:

```ts
await connection.consumeInteractive(async (msg: string) => {
  const parsedMessage = JSON.parse(msg)
  await semaphore.acquire()
  try {
    await processingService.processMessage(parsedMessage)
  } finally {
    semaphore.release()
  }
})
```

**Dead-letter queues**: declare two DLQs, one per consumer queue, bound to the existing `dlx.graph` dead-letter exchange (mirrors the `dlx.graph` / `dlq.crisalid-ikg-actions-interactive` pattern in `definitions.sample.json`):

| Consumer queue           | DLQ                          |
| ------------------------ | ---------------------------- |
| `sovisuplus-interactive` | `dlq.sovisuplus-interactive` |
| `sovisuplus-batch`       | `dlq.sovisuplus-batch`       |

Both consumer queues must be asserted with `x-dead-letter-exchange: dlx.graph` and `x-dead-letter-routing-key` set to their own queue name. Both DLQs are asserted by sovisuplus at startup (`assertQueue`, durable, `x-consumer-timeout: 43200000`), bound to `dlx.graph` with the **source queue name** as routing key (e.g. `sovisuplus-interactive` for `dlq.sovisuplus-interactive`). Using a specific routing key rather than `#` ensures each DLQ only receives dead letters from its own source queue.

`definitions.sample.json` in `crisalid-deployment` has been updated accordingly.

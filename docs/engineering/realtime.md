# Realtime draw availability

Live availability is part of v1 ([FR-03](../spec.md), D-17). Family members
may open the link together; a committed pick should promptly dim unavailable
ornaments for everyone still choosing. This reduces avoidable conflicts.
The [draw transaction](draw-protocol.md) still decides each pick atomically.
No network transport can eliminate the final simultaneous-click race.

## 1. Transport and scope

Use Server-Sent Events (SSE) from the existing Fastify API. A browser
`EventSource` receives one-way server notifications; picks remain authenticated
HTTP POSTs with CSRF protection and idempotency. SSE fits this direction of
communication and supports reconnecting connections. See the browser platform's
[EventSource documentation](https://developer.mozilla.org/en-US/docs/Web/API/EventSource).

No separate realtime deployment, websocket protocol, Redis or broker is needed
for a single API process and at most 30 participants. Stream only while an
unassigned, authenticated participant has the draw view visible, including
simple view. Maintain at most one connection per such browser tab, not per
component or ornament. Close on navigation away, sign-out or hidden tab;
resynchronise on returning. A pending HTTP mutation survives stream closure.

Initial scope is draw availability and stream/session lifecycle. Wish/claim
streaming and presence indicators are deferred. In particular, there must be
no group claim event or shared claim revision. Owner edit/delete locks are the
explicit privacy exception in INV-06; this stream still carries no claim data.

## 2. Safe wire contract

`GET /api/v1/me/draw-events` authenticates the participant's same-origin session,
requires the current open season, and returns `text/event-stream` with
`Cache-Control: no-store, no-transform`. No bearer token or identity appears in
the URL. Apply a same-origin/Fetch Metadata policy without requiring a custom
CSRF header on this read-only native EventSource request. Cross-origin streaming
is not enabled. Unauthenticated/expired requests fail before a stream opens.

Named application events:

| Event              | Data                                                     | Client response                                                           |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ready`            | `{ seasonId, drawRevision }`                             | Always refresh own assignment and pool, even if revision was already seen |
| `draw-invalidated` | `{ seasonId, drawRevision }`                             | Refetch own assignment/pool when newer than the applied snapshot          |
| `heartbeat`        | `{}`                                                     | Record liveness without exposing activity                                 |
| `session-ended`    | `{ reason: 'expired' \| 'revoked' \| 'season-changed' }` | Close stream, clear private client state and re-enter session flow        |

Send no giver/recipient identity, chosen slot, timestamped activity log or
per-person progress. Recompute the complete viewer-specific pool through
`GET /me/draw-options`; both taken and newly infeasible choices can change.
Clients must not infer a global recipient from a slot or apply another viewer's
pool. The existing draw revision reflects picks only, never wishes or claims.

`session-ended` is best-effort. A stream error also triggers `/me` validation;
401 closes retry/polling and clears private state. Check session validity before
application event delivery and at heartbeat time. Reset/logout/completed recovery actively close
affected in-process streams after commit; checking database state covers missed
closure signals. No private data is sent after a failed validity check.

## 3. Consistency and delivery

Publish the new draw revision only after the assignment transaction commits.
Failed picks/rollbacks emit nothing; idempotent receipt replay creates no new
revision. Publishing failure must not change a committed HTTP success.

Subscribe to in-process notifications before taking the initial database
snapshot. Queue/coalesce invalidations while reading it, send `ready`, then
send any newer revision. This avoids a subscription gap. Revisions are
monotonic within a season; never compare them across different season IDs.

On the client, keep separate highest-observed and applied revisions. Accept
only snapshots for the active identity/season; never apply an older revision
after a newer one. If an event arrives during a read, mark it dirty and fetch
again until the applied revision catches up. Coalesce bursts (up to 100ms),
without continually postponing the refresh. Always recompute availability on
the server; stable slot mapping, placement and colour survive every update.

Treat events as disposable invalidations, not a durable event log. Do not rely
on Last-Event-ID replay; every connection/reconnection gets a fresh `ready`
snapshot and authorised reads. Keep a two-second shared database revision
reconciliation loop while streams exist. It catches a commit whose in-process
notification was missed. Stop it when no viewers remain. On process restart,
connections reconnect and resynchronise; PostgreSQL remains authoritative.

V1 assumes one API process. Before deploying multiple workers/replicas, replace
in-process-only immediate fan-out with PostgreSQL LISTEN/NOTIFY or another
shared adapter and retain snapshot reconciliation. Cross-replica latency must
pass the same acceptance gate; merely adding replicas invalidates the original
immediate-delivery assumption. No database connection is held per viewer.

## 4. Connection lifecycle and fallback

Send a named `heartbeat` event every 15 seconds, rechecking session validity.
Use an observable event rather than only an SSE comment so the browser adapter
can run its liveness watchdog; comments are not dispatched by EventSource. Bound
per-connection buffers and drop a slow connection rather than retain unlimited
events. Disconnect cleanup removes timers/listeners. Use Fastify-supported
streaming and explicit cleanup; if using raw/hijacked replies, account for
bypassed hooks in auth/header/teardown tests. See
[Fastify reply lifecycle](https://fastify.dev/docs/latest/Reference/Reply/).

Configure HTTP/2 at the public ingress, disable response buffering/compression
batching on the event stream, flush events promptly, and set idle timeouts
above heartbeat spacing. Multiple HTTP/1 tabs can exhaust per-origin connection
limits; test the actual ingress and retain polling fallback. See the platform
[SSE deployment guidance](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

If no ready event arrives within eight seconds, a connection fails, or a
45-second heartbeat watchdog expires, validate the session and start polling
own assignment/pool every three seconds with jitter while visible. Keep one
fallback timer, never overlapping fetches. Retry streaming with bounded
exponential backoff and jitter (one to thirty seconds); do not stack native
and application retry loops. Stop polling only after a fresh stream-triggered
snapshot succeeds. Manual refresh remains available.

After returning from a hidden tab, refresh before enabling slots; a recent
successful polling snapshot may enable them even if streaming is unavailable.
A live connection never reserves a recipient. Uncertain pick outcomes stay
locked until the original HTTP command is reconciled, independent of pool
updates. If another tab has already completed the draw, own-assignment refresh
restores that result and leaves the tree without animating a losing slot.

## 5. Acceptance and budgets

Target p95 under one second from committed pick to refreshed visible choices
across 30 connected participants on a healthy test network. Measure through
the real ingress, not just in-process publish duration. A missed signal should
be detected by the two-second revision loop, plus ordinary read/network time.
Fallback freshness is the three-second polling interval plus request time;
no freshness guarantee is possible offline.

Test 30 simultaneous viewers and near-simultaneous clicks, including a pick
that invalidates another edge through feasibility rather than recipient reuse.
Verify post-commit publication, no publication on rollback, notification loss,
reordered events/read responses, commit during initial subscription, reconnect,
process restart, multiple tabs, slow consumers, HTTP buffering, auth expiry,
logout/reset with open streams, and hidden-tab return. Inspect all event payloads
for identities and any claim data. Keyboard focus, camera, slot colours and
positions must survive updates. Prove the same transaction invariants with
SSE disconnected entirely. Add these gates to P1, P3 and the group rehearsal.

# Engineering architecture and stack

20 September 2026 · proposed implementation baseline. Product authority is
[the specification](../spec.md); new decisions are [registered separately](../decisions.md).

## 1. Stack

| Concern   | Choice                                                               | Reason                                                                     |
| --------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Frontend  | Angular 21.2, standalone, OnPush, zoneless                           | Matches the reference project and supports a signals-first architecture    |
| 3D        | Angular Three 4.2.4, Three.js 0.182.0, matching `@types/three`       | Compatible inspected peer set; retain the prototype's procedural world     |
| State     | NgRx SignalStore 21.1.1                                              | One store style, matching the reference                                    |
| Forms     | Angular Signal Forms from the pinned Angular minor                   | Reference convention; isolate experimental API behind form components      |
| Styling   | SCSS, CSS custom properties, semantic HTML                           | Custom paper/house language without a generic component-kit appearance     |
| Language  | Typed `hu`/`en` message dictionaries and an Angular signal service   | Runtime switching, small copy set, no separate locale builds               |
| Backend   | Node 24 LTS, Fastify 5, TypeScript ESM                               | Small function-oriented modules, schemas, hooks and explicit transactions  |
| Database  | PostgreSQL 18, Drizzle ORM/migrations, `pg` driver                   | Constraints and row locking protect shared draws/claims                    |
| Contracts | Zod 4 schemas; explicit REST DTOs and generated OpenAPI              | Runtime validation and shared safe types without sharing database entities |
| Workspace | npm 11 workspaces, Angular CLI, one lockfile                         | Enough structure for two applications and shared contracts                 |
| Testing   | Vitest 4, Fastify injection, real PostgreSQL integration, Playwright | Match reference unit-test style; prove concurrency and browser UX          |
| Delivery  | Containerised Node/static app + persistent PostgreSQL; HTTPS ingress | One origin, few moving parts, independent database backups                 |

Realtime draw availability uses an authenticated SSE endpoint in the same
Fastify process. Events invalidate the viewer's own draw pool; the server
never broadcasts selected people or global slot mappings. Ordinary HTTP still
handles picks. See the [realtime contract](realtime.md).

Use Angular's HttpClient and Router. Resource-based GETs belong in domain
stores; writes use explicit mutation commands. Use RxJS at async boundaries,
not a second global state architecture. An owned EventSource adapter in data
access feeds draw invalidations into the store; it has no mutation authority. No general animation framework is
required: central action/ambient clocks and small Three.js timelines suffice.

Fastify is preferable here to NestJS: there are few feature modules, no need
for a second class/decorator architecture, and transactions should remain
visible in small use-case functions. PostgreSQL adds one service but makes
races, constraints and backups explicit. SQLite could work at this scale;
using two database dialects or changing storage by environment would make
correctness harder to demonstrate. Redis, GraphQL, websockets, SSR, Kubernetes
and microservices add no needed v1 capability.

### Version evidence

The reference checkout declares Angular `^21.2.0`, Angular Three `4.2.4`,
Three `0.182.0`, NgRx Signals `21.1.1`, ngxtension `7.3.0`, TypeScript
`~5.9.2`, RxJS `~7.8.0` and npm `11.16.0`. The installed Angular Three
manifest declares Angular `>=20 <22` and Three `>=0.157 <0.183`. This is
local manifest evidence, not a fresh install/build in this repository.

Angular's [compatibility table](https://angular.dev/reference/versions)
allows Angular 21.2 with Node 24 and TypeScript 5.9. Angular 21 is in LTS;
review upgrades before its support ends in June 2027, using the official
[release policy](https://angular.dev/reference/releases). Node 24 is an LTS
line in the [Node schedule](https://github.com/nodejs/Release). Check Fastify's
[LTS policy](https://fastify.dev/docs/latest/Reference/LTS/) when pinning patches.

Signal Forms in the reference's installed Angular 21 typings are explicitly
experimental. The current [Angular form guide](https://angular.dev/guide/forms/signals/overview)
also distinguishes stability needs. Keep this convention as proposed, prove
native-input, radio, validation and keyboard behavior in P0, and isolate it.
If a blocker requires typed Reactive Forms, record the deviation before
changing the lint restrictions; do not quietly mix form systems.

P0 records exact resolved versions, public peer dependencies, lockfile and
reproducible clean build. Pin the Angular/Three family, tools and runtime
patches; do not use `--force` or `--legacy-peer-deps`. Current upstream versions
are not permission to upgrade the reference's compatible set blindly.
PostgreSQL 18 is a supported major per its [version policy](https://www.postgresql.org/support/versioning/).

## 2. Workspace and dependency directions

Planned layout, not directories already implemented:

```text
apps/
  web/src/app/
    core/                 pure frontend values/helpers
    state/domain/         session, roster, draw and wish stores
    state/view/           navigation, camera intent, preferences, drafts
    state/persisted.ts    guarded non-secret device preferences
    data-access/          typed HTTP client, mutation transport
    scene/render/         geometry and buffer builders
    scene/appearance/     materials, textures, shaders and lighting functions
    scene/world/          Angular Three components and Three interop
    scene/runtime/        clocks, camera, projection and lifecycle adapters
    ui/                   input/output-only HTML controls and paper forms
    containers/           domain/view composition, routes and destinations
    i18n/                 typed dictionaries and localisation adapter
  api/src/
    domain/               pure draw, wish and authorisation rules
    application/          transaction-scoped use cases, port definitions
    adapters/db/          Drizzle schema, repositories and migrations
    adapters/previews/    outbound HTTP/image isolation
    adapters/auth/        password and session implementation
    http/                 Fastify routes, schemas and error mapping
    bootstrap.ts          dependency wiring
packages/
  contracts/              public request/response schemas, error codes
scripts/                  checks and development utilities
```

Only contracts are shared between browser and server. They contain no hidden
slot mapping, assignment table, password type or claimer ID. API domain code
is server-only even when pure. Frontend build boundaries prohibit imports from
`apps/api`, database packages or Node built-ins. Contracts import neither app.

Frontend domain stores can depend on contracts, HTTP adapters and pure core;
view stores depend on core and preference persistence. Neither store family
imports the other. Containers compose both. Pure rendering takes geometry
data, not participants or API DTOs. Scene components adapt a minimal view model
and opaque action IDs; they never fetch recipients or decide feasibility.
See [coding standards](coding-standards.md) for enforceable boundaries.

Backend HTTP handlers validate and authenticate, call a use case, serialize
an audience-specific DTO. Application code owns transaction scope and receives
repository/crypto/clock ports. Domain functions receive plain data and return
results. Adapters implement the ports; bootstrap wires them. Avoid generic
repository frameworks and a class for each table.

## 3. Frontend state and scene lifecycle

Domain state contains the authenticated identity, current season, own
assignment, server slot availability, wishes and in-flight commands. View
state contains destination, focused sheet, local editor draft, scene quality,
motion/audio preferences and harmless decorative state. Clearing authentication
clears both private data and all per-identity drafts.

Use resource/httpResource for reads keyed by identity, season and selected
participant. Ignore late responses after identity/season changes. Commands
explicitly represent idle/pending/success/error/unknown outcomes, use stable
idempotency keys and invalidate affected resources after acknowledged writes.
No draw/claim side effect is driven by a reactive `effect()`.

Scene objects are owned and disposed by one component/runtime owner. Share
static materials/geometry deliberately; dispose only the owner's resources.
Merge/instance static decoration; keep door, cat, ornaments, flames and moving
props separate. Update render-loop properties outside Angular change detection;
write signals only when meaningful interaction state changes, not every frame.

The scene exposes anchors and projection matrices to a DOM surface adapter.
Board/paper text stays in semantic Angular HTML. Projection batches reads and
writes once per rendered frame; hidden/clipped elements are inert. Read/write
mode locks scene orbit; room mode gives drag gestures a movement threshold
before considering a click. Camera paths interpolate semantic anchors and fit
bounds to available viewport, rather than copying all prototype coordinates.

Maintain separate ambient time and action time. Ambient pause affects weather,
fire flicker and easter eggs; lamp state and user actions do not depend on it.
Reduced motion uses final action states; hidden tabs suspend renderer/audio.
Use bounded frame deltas and disposal on route/renderer teardown. A context
loss switches presentation without clearing a committed result or draft.

## 4. Performance and browser contract

Provisional budgets to measure in P0 and enforce/tune with recorded evidence:

| Measure                          | Target / gate                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Critical shell JS                | ≤250 KiB gzip, excluding lazy 3D and organiser chunks                                                                    |
| First interactive house transfer | ≤2 MiB compressed JS/CSS/fonts/required assets total                                                                     |
| Shell paint / interactive house  | ≤1.5s / ≤5s on cold 10 Mbps, 100ms RTT profile                                                                           |
| Mobile animation                 | Aim 60 fps on physical high-end Android/iPhone; minimum ≥30 fps, p95 frame ≤33ms over a 60s room run                     |
| Desktop animation                | Aim 60 fps on integrated graphics; avoid repeated >50ms main-thread work during interactions                             |
| Scene complexity                 | Initial target ≤200 draw calls and ≤250k visible triangles at mobile quality                                             |
| API                              | p95 <300ms for ordinary authenticated requests; <500ms draw transaction at 30 people, excluding network/password hashing |
| Idle/hidden                      | No rendering in hidden tabs; demand rendering when all motion is paused                                                  |

Budgets are acceptance targets, not claims about today's prototype. Record
bundle compression method and actual device/browser versions. Lazy-load the
renderer and organiser. Paint meaningful shell first, yield between large
construction batches, and avoid forced trivia delays.

Start DPR at 1 on small phones, cap desktop at 1.5, then lower quality based
on sustained frame cost. Prefer fewer particles, no-shadow local lights,
cached shadows and reduced postprocessing before sacrificing text/touch size.
Use one renderer and a restrained bloom/grain/vignette pass. WebGL2 is required
only for the immersive view; core tasks must also work in simple HTML.

Test current and previous major iOS Safari and Android Chrome where available,
plus current desktop Chrome, Firefox, Edge and Safari. Reconcile this target
with the pinned Angular browser baseline in P0. Primary family devices are
high-end Android phones and iPhones; require a physical recent flagship Android
and iPhone rehearsal, recording exact device/OS versions. Desktop browser
emulation and software WebGL are useful checks, not GPU/battery evidence.

## 5. Backend operation and deployment

Host on the owner's server: publish versioned source to GitHub, clone it there,
and operate a configurable Docker stack. Docker Compose is the proposed
single-server packaging. The [deployment contract](deployment.md) defines
configuration, secrets, build/migration/start/upgrade steps and SSE proxy needs.

One HTTPS origin serves hashed static assets and `/api/v1`, including the
long-lived SSE endpoint. Configure HTTP/2 at the ingress, disable buffering
for this route, and verify heartbeat/idle timeouts on the actual host. No permissive
cross-origin API. The service connects to PostgreSQL over a private connection.
Use non-root containers, a dedicated migration job, pooled database connections,
health/readiness endpoints and graceful request drain on shutdown.

All season mutations take the same season row lock before other locks. At
30 people, deliberate short serialisation is simpler than a distributed lock.
Reads use consistent snapshots where several tables compose one response.
Transactions never wait for password hashing, link fetches, image decoding or
animations. Detailed contracts are in [data/API](data-api.md) and the
[draw protocol](draw-protocol.md).

Environment configuration includes database URL, public origin, organiser
password hash, session lifetime, preview-fetch policy and backup settings.
Operational values and locale guidelines are supplied through validated
environment/secrets/config files. Frontend deployment settings load from an
allowlisted runtime public-config endpoint, without rebuilding for a new domain.
No secrets enter Angular environment files. Structured logs contain request
ID, route template, status and duration; redact bodies, passwords, cookies,
names, URLs, wish descriptions, slot IDs and assignment/claim data. Metrics
are aggregate latency/error counts, with no participant dimensions.

Proposed operations: encrypted daily backups retained seven days, automated
expiry and a rehearsed restore. Reset deletes live seasonal content immediately;
backup copies age out within seven days. Restores happen in maintenance and
revoke sessions before reopening. The operator checks whether a restore would
lose acknowledged picks/claims: never silently reopen a stale draw snapshot.
Agree with the family whether to recover the latest state or explicitly reset.
Target RPO ≤24h and RTO ≤4h; these describe recovery limits, not seamless draw
rollback. Record server capacity, backup destination and final retention policy
before launch; no hosting-provider selection is outstanding.

Use install metadata and icons. If adding a service worker, cache only public
versioned assets, never `/api`, private HTML or mutations; a fresh install may
still require network. Show a friendly offline screen with explicit retry.
Self-host fonts/assets and retain their licenses. No private-data analytics.

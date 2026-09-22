# Implementation plan and release gates

This plan implements the [product](spec.md), [UX/UI](ux-ui.md), and
[engineering architecture](engineering/architecture.md). Work packages are
ordered by dependency, not calendar estimates. Complete each exit gate before
building on an unproven assumption. The connected application is now runnable;
see [implementation status](engineering/implementation-status.md) for evidence
and remaining exit gates.

## P0 — Foundation and compatibility proof

**Depends on:** review of stack/standards proposals D-10–16.

Create npm workspaces, Angular application, Fastify application and contracts
package. Add the configurable Docker packaging/public runtime config described in
[deployment](engineering/deployment.md); use the versioned historical guidelines
as default content. Pin the compatible Angular 21.2 / Angular Three 4.2.4 / Three 0.182
family, Node 24, TypeScript 5.9 and public tooling. Add local database/container
setup, environment example with no secrets, migrations, root developer README,
formatting, strict lint/boundaries, zero-warning ratchet and CI checks.

Build one production-path scene with a desk plane, lamp, camera travel and a
projected semantic form using Signal Forms. Include native radio priorities,
mobile keyboard handling, one API read/write through contracts, simple HTML
view and WebGL loss recovery. This is a technical spike on the accepted design,
not another round of unrelated visual concepts.

**Exit:** clean install/build without private registry or peer overrides;
resolved versions recorded; effective lint rules verified; scene/form works
on physical Safari and Android; projection/focus are usable at 320px; API
schema validation works. Capture initial bundle/frame metrics. If Signal Forms
or renderer compatibility blocks the spike, update the decision before porting
more code. This is where architectural risk is cheapest to resolve.

## P1 — Authoritative season, identity and draw

**Depends on:** P0; confirmed recovery/reset outcomes D-18–19.

Implement schema/constraints, secure cookie sessions, password hashing, CSRF,
rate limits, organiser-issued recovery links and redemption, full credential
clearing on season reset, organiser setup/validation/open/reset, role isolation, concealed
slot creation, matching feasibility, draw transaction, idempotency receipts
and recovery. Add the authenticated SSE invalidation endpoint, post-commit
signalling, revision reconciliation, reconnect and polling fallback. Test first
through API and a minimal accessible participant UI.
No production participant data is needed yet.

**Exit:** FR-01–03 and INV-01–05/08–09 pass protocol tests, real multi-connection
races and failure injection. Reset-vs-draw cannot affect the replacement season.
Inspect browser responses/logs for concealed mappings and assignments belonging
to anyone else. Normal organiser APIs cannot fetch assignments; recovery
authority is explicitly trusted and tested as specified, not an impersonation
shortcut. Recovery preserves exchange data and revokes old sessions; full reset
unprotects every name. Expired/reused/replaced recovery links fail safely.
A lost response recovers the same committed pick with no second selection.
Thirty simultaneous viewers update their own availability within the realtime
budget. Test disconnect/reconnect, reordered reads, stream failure, process
restart and reset/logout during an open stream; no event reveals a selected
person. Transaction race guarantees hold with streaming completely disabled.

## P2 — Wishes, private claims and safe previews

**Depends on:** P1.

Implement own wish CRUD with content versions and idempotency; participant
lists with audience-specific projections; claim/release transactions; stable
pagination; draft retention; preview adapter/cache/image sanitisation. Complete
runtime English/Hungarian dictionaries, guideline content structure and graceful
plain-link/error/empty states in simple HTML first.

**Exit:** FR-04–08, INV-06–08. A claimed wish cannot be changed/deleted even
in a request race. Owner lock capabilities/errors are the documented exception
to hidden claim state; no response reveals buyer identity or claim timestamps.
Only one concurrent claim wins; non-claimers cannot release it. Retries do not
duplicate wishes or revive released claims. Preview timeouts/SSRF attempts cannot
block saving or reach internal networks. Both languages preserve active drafts.

## P3 — Port the complete house and participant journey

**Depends on:** P0 scene proof, P1/P2 production contracts.

Port procedural geometry/materials into render/appearance functions and Angular
Three scene components. Treat the prototype as an art/interaction reference;
do not wrap its monolithic JS app or migrate its local-storage backend.

Implement furnished entrance, identity at doorstep, room anchors, responsive
camera choreography, tree branches and fixed coloured slots, committed-result
cat leap, mantel notes, names-only board pages and paper stacks, seated desk
with chair/lamp, forms on paper, outside/Escape dismissal and utility navigation.
Bind all to the same stores/API as simple view. Remove prototype replay/sample
controls from production.

**Exit:** every stage in the UX table works end-to-end for 2, 8 and 30 people.
Selected slot matches the server result, including duplicate tabs and interrupted
responses. No wall/heading/label blocks the active content at any required ratio.
Forms remain editable with mobile keyboard, 200% text and both languages.
Returning session lands at the mantel; signed-out state reveals no private data.

## P4 — Atmosphere, accessibility and performance

**Depends on:** P3, with rendering measurements begun in P0.

Port live fireplace, window snow/passing light, ambient snow, snowman/snowballs,
visible Santa/star, cat nap, cookies/chewing and optional ambient audio. Implement
shared ambient clock, independent intentional actions, reduced motion, hidden-tab
suspension, owned-resource disposal and adaptive quality. Self-host licensed
fonts; add sourced loading facts, install metadata and public-only asset caching
if a service worker is used.

**Exit:** FR-09 and accessibility/performance targets. Physical-device tests,
not only software-rendered screenshots. Pausing does not disable lamp/forms or
navigation; reduced motion completes every core task with no flight/camera
animation. Full keyboard/screen-reader journey and simple view have feature
parity. Santa/star appear in visible sky, do not intercept input, and do not
run behind a paper close-up. Repeated visits show no sustained GPU/resource leak.

## P5 — Rehearsal and release readiness

**Depends on:** P1–P4; own-server configuration and backup destination/retention
set. Budgets/guidelines and primary Android/iPhone device classes are confirmed.

Rehearse setup/open, participant enrolment, complete constrained draw, wishes,
claim races, returning sessions and reset in a disposable season. Review all
Hungarian copy with a native speaker and try the app with a less confident
family member. Exercise real HTTPS/cookies, migrations, backup/restore,
expired sessions, offline/context loss, monitoring and maintenance handling.

**Exit:** acceptance matrix below passes; operational runbook, final screenshots,
measured device metrics and known limitations are recorded. Resolve privacy or
assignment-correctness failures before launch. Prototype browser storage is
never imported. Deployment and real season opening are separate explicit
operator actions; writing this plan does not perform either.

## Acceptance and traceability matrix

| Requirement                        | Evidence required                                                                                                                                | Gate       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| FR-02 / D-18 recovery              | Token expiry/reuse/races, private delivery, data preserved, old sessions closed, normal login restored                                           | P1, P5     |
| D-22–24 deployment/content/devices | Fresh GitHub checkout to own-server Docker, environment-only domain changes, exact historical rules, physical flagship Android/iPhone checks     | P0, P5     |
| FR-01 setup/reset                  | Invalid matching rejected; directed exclusions; immutable open roster; destructive reset and cleared-password/re-enrolment policy                | P1, P5     |
| FR-02 identity/return              | Concurrent enrolment, protected login, remembered/expired/revoked sessions, role isolation, doorway and mantel return                            | P1, P3     |
| FR-03 / INV-01–05                  | Exhaustive small-graph oracle, 30-person properties, separate-connection draw races, slot stability and no leaks                                 | P1         |
| INV-08–09                          | Crash/lost-response retries, duplicate tabs, season reset races, no second selection during unknown outcome                                      | P1–P3      |
| FR-04 / INV-07                     | Limits, Unicode, ordering, owner-only CRUD, edit conflicts, duplicate-create retry, claimed-item edit/delete rejection                           | P2         |
| FR-05                              | Mantel vs board destinations, names only, own name excluded, one sheet at a time, eight-card/30-person paging                                    | P3         |
| FR-06 / INV-06–07                  | Claim-vs-edit/delete races; owner lock only, no claimer identity/timestamps; release authorisation and unlock                                    | P2         |
| FR-07                              | Nonblocking compose/read previews; malformed pages, redirects, rebinding, internal IPs, image/byte/time bounds                                   | P2         |
| FR-03 / D-17 realtime              | 30 viewers, <1s healthy-path updates, post-commit only, safe invalidation payloads, reconnect snapshots, polling fallback and focus preservation | P1, P3, P5 |
| FR-08                              | Complete HU/EN keys, draft-preserving switch/refresh, guidelines, sound opt-in, sign-out clears private state                                    | P2–P4      |
| FR-09                              | Living room props and sky captures, pause/reduced-motion clocks, hidden-tab stop, simple-view parity, offline error                              | P4         |
| UX accessibility                   | Keyboard, VoiceOver/TalkBack, focus restore, radio semantics, text zoom, 44px targets, contrast over live scene                                  | P0, P4     |
| UX mobile                          | 320px to ultrawide captures, physical keyboard viewport, no wall occlusion or overlapping cards/labels                                           | P0, P3–P4  |
| Engineering                        | Fresh public install, lint/type/format/docs/build checks, measured bundles/frames/API, migration/restore rehearsal                               | P0–P5      |

## Test strategy

Use meaningful pure tests for matching, payload projection, validation, camera
fit/projection and state transitions. Add contract/HTTP tests for permission
boundaries. Use real disposable PostgreSQL for constraints, idempotency and
concurrent transactions; a mocked repository cannot prove those guarantees.

Playwright covers the built app with isolated participant sessions, deterministic
decorative clocks in test builds, real API and seeded disposable data. Capture
console/WebGL errors and test transport failures after commit. Keep test hooks
out of production bundles. Static images prove composition only; verify motion
with bounded time samples and user actions. Use physical devices for Safari,
soft keyboards, sound activation, GPU cost, battery/thermal behavior and assistive
technology. Do not spend time snapshotting every decorative mesh.

CI sequence: clean install → formatting/docs/type/lint checks → unit tests →
integration tests/migrations → production build/bundle budgets → browser flows.
Run narrower checks during development; the complete release suite runs for a
release candidate. Baseline screenshots change only after intentional visual
review, not automatically to make a failure disappear.

## Completion record for this documentation pass

The product spec now reflects the final Winter House decisions. Architecture,
API/data, draw algorithm, coding standards, UX/UI, proposed defaults and delivery
gates are documented. Abandoned design docs and rejected comparison pages are
removed; the live house and illustrated fallback remain runnable. No frontend
workspace, backend service, lint setup or deployment had been implemented at
that documentation checkpoint. The subsequent implementation and validation are tracked in
[implementation status](engineering/implementation-status.md).

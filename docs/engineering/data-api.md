# Data, API and operational contracts

This is the proposed server contract for the [product specification](../spec.md).
The application is one group per deployment; IDs are opaque UUIDs, timestamps
are UTC ISO 8601, and API messages use stable codes localised by the client.
All routes below are prefixed `/api/v1`.

## 1. Relational model

| Table               | Important fields and constraints                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `season`            | Singleton current row: ID changes on reset, `setup/open`, label, setup revision, draw revision, opened timestamp                                                             |
| `participant`       | ID, display name, normalised unique name, nullable password hash, credential generation, created timestamp; name retained but password cleared on reset                      |
| `exclusion`         | Composite primary key `(giver_id, recipient_id)`; both reference participants; no self row needed                                                                            |
| `draw_slot`         | ID, season ID, giver ID, hidden recipient ID, ordinal, colour; unique `(season,giver,recipient)` and `(season,giver,ordinal)`                                                |
| `assignment`        | Season ID, giver ID, recipient ID, selected slot ID, created timestamp; unique giver and recipient per season; check giver differs from recipient                            |
| `wish`              | ID, season ID, owner ID, description, nullable URL, priority, content version, created/updated timestamps                                                                    |
| `claim`             | Wish ID primary key, claimer ID, created timestamp; cascade on wish deletion                                                                                                 |
| `session`           | Hash of random token, participant ID or organiser role, season ID/credential generation for participants, organiser last-reauth timestamp, created/expiry/revoked timestamps |
| `mutation_receipt`  | Actor, season, operation, key, payload digest, response status and safe response; composite unique key                                                                       |
| `password_recovery` | Token hash, participant/season IDs, credential generation, expiry/consumed timestamps; one active token per person; clear on season reset                                    |
| `recovery_audit`    | Restricted issuer/participant/season IDs, issued/redeemed time and outcome; no tokens or exchange content; clear on season reset                                             |
| `preview_cache`     | Season ID + normalised URL hash, bounded metadata, optional re-encoded image, fetched/expiry timestamps; no claim/assignment relation                                        |

Use foreign keys and composite references to prevent cross-season joins. An
assignment's `(season,giver,recipient,slot)` must reference the corresponding
slot; uniqueness/check constraints supplement application rules. The claim
owner restriction needs a use-case check because it crosses tables. No raw
database row is returned from a route. Parameterise all SQL.

Normalise roster uniqueness with Unicode NFC, trim/collapse whitespace and a
consistent case-fold policy; do not remove accents. Display names are 1–80
code points, no control characters; duplicates require an explicit distinguishing
name. Passwords are not trimmed or normalised. Wish descriptions count Unicode
code points, not UTF-16 units. Apply the same validation on client and server.

Wish content versions/timestamps change on author edits only. Claims live in
a separate table; they change owner-visible `canEdit`/`canDelete` capabilities,
not authored content timestamps. Reset deletes seasonal rows, preview assets
and recovery tokens, nulls participant password hashes and revokes sessions.
Shared roster and exclusions remain; all names become unprotected.

## 2. Permissions and response projections

| Caller                  | Allowed reads/writes                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Anonymous               | Season open/waiting status, public content; open-season roster names/protection flags; enrol/login                        |
| Participant             | Own identity/assignment/pool, own wish CRUD; other members' wishes and claim status; claim/release as self                |
| Organiser session       | Setup roster/exclusions, feasibility, open/reset, issue recovery links; no assignments, concealed slots or claim browsing |
| Infrastructure operator | Trusted operational database access; outside the product secrecy boundary                                                 |

An organiser who participates signs in separately as their participant identity.
No API switches or impersonates identities. Do not make admin credentials a
universal bypass for participant routes. Recovery-link issuance is a separate
trusted authority: possession of its link can reset that participant's password,
so the organiser must verify and privately deliver it. IDs supplied by callers never replace
the authenticated actor when checking ownership.

Public contracts include:

```ts
type Priority = 'low' | 'medium' | 'high';
type ClaimState = 'available' | 'mine' | 'claimed';
type SlotState = 'available' | 'unavailable';
```

`OwnWishDto` contains ID, owner ID, text, URL, priority, content version,
creation/update timestamps, safe preview metadata and `canEdit`/`canDelete`.
Both capabilities are false while a claim exists; true otherwise. `GiverWishDto` adds
`claimState`. They have separate strict response schemas: owner serialization
cannot accidentally accept detailed claim fields. The owner capability fields
intentionally disclose the locked state. Never send claimer IDs, hidden
recipients, password hashes or internal audit rows.

Requests for one's own list through the general participant-list endpoint
return the owner projection, not the giver projection. Owner claim/release
attempts always fail identically whether or not a claim exists. Author edit/
delete requests for a claimed wish return `409 WISH_LOCKED`; no buyer ID or
claim timestamp is sent. This lock and the capability flags are the intentional
exception to claim-state secrecy. Do not add claim counts, sorting, content
version changes or a global claim revision. Participant responses use
`Cache-Control: no-store`; caches must not mix identities.

Assignment, ornament-pool and wish-list responses include the authenticated
`viewerId`. The client binds these responses to its current identity and season,
discards stale requests, and clears private room state on a viewer mismatch (for
example, after another tab signs in as a different family member).

## 3. HTTP surface

| Method / route                              | Auth           | Contract                                                                                                              |
| ------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GET /bootstrap`                            | Public         | Season ID/status; roster names and protected flags only when open; no wishes/exclusions/picks                         |
| `POST /auth/enrol`                          | Public         | Participant ID, season ID, password; atomic first enrolment; sets participant cookie                                  |
| `POST /auth/login`                          | Public         | Participant ID, season ID, password; sets participant cookie                                                          |
| `POST /auth/logout`                         | Participant    | Revoke session, expire cookie; idempotent                                                                             |
| `POST /auth/recover`                        | Recovery token | Season-bound token + new password; atomic single use, revoke sessions, then normal login                              |
| `POST /organiser/participants/:id/recovery` | Organiser      | Reauthenticate, verify person, issue latest single-use link; no assignment returned                                   |
| `GET /public-config`                        | Public         | Allowlisted public runtime settings and locale guidelines; never secrets                                              |
| `GET /me`                                   | Participant    | Identity, season and CSRF token; no group claim/draw metadata                                                         |
| `GET /me/assignment`                        | Participant    | Own recipient identity and selected slot, or explicit `not-drawn`                                                     |
| `GET /me/draw-events`                       | Participant    | Read-only authenticated SSE invalidations for current-season draw revision; see realtime contract                     |
| `GET /me/draw-options`                      | Participant    | Own fixed slots, aggregate availability, draw revision; no hidden names                                               |
| `POST /me/draw`                             | Participant    | Season ID, slot ID + idempotency key; committed assignment or typed conflict                                          |
| `GET /me/wishes`                            | Participant    | Cursor-paged owner projection                                                                                         |
| `GET /participants`                         | Participant    | Current group names excluding self; no counts or named pick progress                                                  |
| `GET /participants/:id/wishes`              | Participant    | Cursor-paged giver projection, or owner projection for self                                                           |
| `POST /me/wishes`                           | Participant    | Validated wish input, season ID and idempotency key; created owner sheet                                              |
| `PATCH /me/wishes/:id`                      | Owner          | Input + expected content version, season ID and idempotency key                                                       |
| `DELETE /me/wishes/:id`                     | Owner          | Expected content version, season ID and idempotency key; rejects while claimed with WISH_LOCKED                       |
| `PUT /wishes/:id/claim`                     | Non-owner      | Season ID + expected content version + idempotency key; available→mine or existing mine; other claimer gives conflict |
| `DELETE /wishes/:id/claim`                  | Claimer        | Season ID + idempotency key; removes own claim; absent is idempotent; another claim is forbidden                      |
| `POST /previews`                            | Participant    | URL + season ID; bounded async request; safe metadata/status, never fetched HTML                                      |
| `GET /previews/:id`                         | Participant    | Poll bounded pending request; current-season only, no requestor identity                                              |
| `GET /previews/:id/image`                   | Participant    | Re-encoded safe image if present; no redirects to arbitrary URLs                                                      |
| `POST /organiser/auth/login`                | Public         | Organiser password; separate short session/cookie                                                                     |
| `POST /organiser/auth/reauthenticate`       | Organiser      | Current password + CSRF; update recent-auth timestamp for recovery issuance                                           |
| `POST /organiser/auth/logout`               | Organiser      | Revoke organiser session                                                                                              |
| `GET /organiser/setup`                      | Organiser      | Roster, exclusions, setup version, status and CSRF token                                                              |
| `PUT /organiser/setup`                      | Organiser      | Complete ≤30-person roster/exclusion document + expected version; setup only                                          |
| `POST /organiser/validate`                  | Organiser      | Read-only feasibility result for current saved setup                                                                  |
| `POST /organiser/open`                      | Organiser      | Season ID + expected version + idempotency key; validate again in transaction                                         |
| `POST /organiser/reset`                     | Organiser      | Current season ID + explicit confirmation + idempotency key; returns new setup season                                 |

Wish pagination uses a stable `(createdAt,id)` cursor, default 20, maximum 50.
No arbitrary ordering or owner claim filters. The board has independent visual
pages of eight names. Fetching a list never marks it read or exposes who visited.

Errors: `{ error: { code, requestId, fields? } }`, no raw exception/SQL/payload.
Use 400 malformed request, 401 expired/missing session, 403 prohibited action,
404 absent or inaccessible resource, 409 domain/version conflict, 422 field
validation, 429 rate limit with Retry-After, 503 temporary dependency failure.
Enumerate `SEASON_CHANGED`, `SEASON_NOT_OPEN`, `NAME_ALREADY_PROTECTED`,
`OPTION_UNAVAILABLE`, `DRAW_ALREADY_COMPLETE`, `CLAIM_UNAVAILABLE`,
`CONTENT_CHANGED`, `WISH_LOCKED`, `RECOVERY_INVALID`, `IDEMPOTENCY_KEY_REUSED`, and `PREVIEW_UNAVAILABLE` in
contracts. Return safe structured field codes rather than English server copy.

Generate OpenAPI from request/response schemas. Zod parses runtime requests;
Fastify response serializers use matching audience-specific JSON schemas.
P0 proves the public integration and strict response projection. Never resolve
this by sending an ORM entity and trusting the frontend to remove fields.

The [realtime contract](realtime.md) defines `/me/draw-events` lifecycle,
post-commit publication, privacy and resynchronisation. The stream carries no
wish/claim events or global participant activity feed. Its GET is read-only,
uses same-origin cookies and never requires a token in the URL.

## 4. Transactions, retries and reset

All mutations touching seasonal data acquire the singleton season lock first,
then validate actor/session/current season and acquire affected row locks.
Use PostgreSQL READ COMMITTED plus this shared locking discipline; multi-query
reads use a REPEATABLE READ snapshot or one SQL statement. Enrolment additionally
locks the participant row; only one request can set a previously null hash.
Hash password outside the transaction, recheck protected status under the lock.

Draw protocol is [specified separately](draw-protocol.md). Claim insertion uses
a unique wish ID: absent→claim, same claimer→success, different claimer→409.
Release checks ownership before deletion. Wish edit/delete checks the active
claim and then expected content version under the shared season/wish locks.
Return `WISH_LOCKED` before any write if claimed. Claim requests also require
the reviewed content version. If an edit wins first, the claim returns
`CONTENT_CHANGED`; if a claim wins first, edit/delete returns `WISH_LOCKED`.
An existing same-claimer claim is idempotent; never silently claim changed
content. A successful release unlocks the owner capabilities. A whole-season
reset may remove all claims/wishes together; ordinary owner deletion cannot
use cascading deletes to bypass a claim.

Use idempotency receipts for nontrivial mutations, including wish creation and
claim/release. Store actor/operation/season/key plus canonical payload digest
and outcome atomically. Same key with different input is rejected. Retain
receipts for the current season so a late retry cannot revive a released claim
or duplicate a saved wish; clients refetch state after replayed responses.
Server errors that roll back the transaction have no committed success receipt.

Reset locks the same season row, deletes its content/receipts, changes season
ID, clears all participant password hashes/recovery tokens, revokes participant
sessions and returns to setup. Roster/exclusions and organiser credentials remain. Stale requests fail;
none may be applied to the replacement season. Preserve a minimal organiser
reset receipt keyed to the old season outside the deleted seasonal receipts,
so retrying a lost reset response returns the same new season rather than
resetting again. It contains no participant-authored content.

## 5. Authentication and request security

Generate 32-byte random opaque session tokens; store only their hashes. Cookies:
`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, no Domain, `__Host-` names,
separate participant/organiser cookies. Participant lifetime is proposed as
120 days; organiser eight hours. Rotate on authentication, revoke on logout;
all participant sessions revoke on season reset. Completed password recovery
revokes every session for that participant; ordinary login after recovery creates
a fresh session. Details: [recovery contract](account-recovery.md). No JWT or auth token in local storage.

Use Argon2id with individual salts. Initial tuning proposal is 64 MiB,
three iterations, parallelism one; benchmark memory/latency on deployment and
never lower below the current [OWASP minimum](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Use asynchronous hashing and a bounded concurrency queue to prevent memory
exhaustion. Seed the organiser's password hash through operator configuration,
never a browser-visible default password or source-controlled secret.

Validate Origin/Fetch Metadata for every unsafe browser request, including
login/enrolment. Authenticated mutations also require a session-bound CSRF
header issued by `/me` or organiser setup. Require JSON content type. Configure
trusted proxies explicitly before trusting forwarded IPs. Initial rate limits:
auth five failed attempts per identity per 15 minutes and 30 per IP, ordinary
writes 60/minute/session, previews five/minute/session; use temporary backoff,
not permanent lockout. Store auth limits in PostgreSQL or another shared adapter
if more than one API process is deployed; test household shared-IP behavior.

Escape all wish/name text through Angular bindings. No rich HTML/Markdown
input, `innerHTML` rendering or bypass-sanitizer calls for participant content.
HTTP(S) links reject userinfo and unsafe schemes, and use `noopener noreferrer`.
Serve a tested CSP permitting only required self-hosted resources; projected
inline style updates need an explicit style policy, not a broad script escape.
Set frame-ancestors none, nosniff and a no-referrer policy. No CORS wildcard.

## 6. Preview fetching

Preview jobs are best-effort and restartable in the Node process; no broker is
needed. Return cached metadata or a pending identifier immediately, process
outside database transactions with concurrency two, and bound pending jobs.
Read polling ends on success/failure/timeout; wish save is independent of jobs.
Expired jobs can be retried on demand. Cache successes up to 24 hours and
failures for ten minutes, within the current season; delete on reset.

Treat every page URL, redirect, metadata image URL and DNS result as untrusted.
Follow the [OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
and implement these application limits:

- HTTP(S) only, default ports, no embedded credentials. Reject IP literals,
  local/metadata hostnames and all non-public IPv4/IPv6 destinations.
- Resolve and validate all addresses before connecting; bind the connection
  to a validated address while retaining correct TLS SNI/hostname checks.
  Revalidate each redirect and image request to prevent DNS rebinding.
- At most two redirects, five-second total page timeout, 1 MiB decompressed
  HTML limit; no cookies, credentials, JavaScript execution or browser engine.
- Parse bounded metadata only. Treat JSON-LD as data; never resolve external
  references. Truncate fields; discard malformed price/currency values.
- Optional image: same network policy, ≤2 MiB input, ≤4 megapixels decoded,
  decode with limits and re-encode to a small raster thumbnail. Reject SVG,
  HTML and animated formats. Never return a remote image URL to the reader.
- No generic proxy endpoint. Image IDs address only validated cached images;
  limits apply again when refreshing. Egress firewall denies internal networks
  as a second boundary. If safe fetching cannot be guaranteed on the host,
  disable previews and retain the mandatory plain-link fallback.

These limits intentionally miss some shops; buying guidance remains usable.
Outgoing product fetches reveal the server IP to that shop, not the reader IP.
The wish URL remains personal content: exclude it from logs/telemetry.

## 7. Required operational verification

Use real PostgreSQL migrations from empty database and an upgrade fixture;
back up, restore and validate constraint/transaction behavior. Exercise session
expiry, reset while writing/drawing, dropped commit responses, cross-identity
access, CSRF and preview SSRF/redirect/size failures. Test claim-vs-edit/delete
with independent connections; no claimed content can change. Assert owners
receive only allowed lock capabilities/errors, never buyer identity/timestamps.
Exercise recovery token reuse/expiry, simultaneous redemption and recovery-vs-
season-reset races. Verify no assignment/claimer details or recovery tokens
reach logs, source maps, client caches or production diagnostic hooks.

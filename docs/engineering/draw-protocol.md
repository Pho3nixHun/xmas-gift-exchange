# Concealed draw protocol

This implements [FR-03 and INV-01–05/08–09](../spec.md). The server owns hidden
mappings. The client chooses an opaque slot; it never receives the identities
behind unchosen slots. A feasibility solver checks choices, not preassignments.

## 1. Definitions

Let `P` be the roster. Legal edges are directed `(giver, recipient)` pairs with
different people and no configured exclusion. Committed assignments `A` have
unique givers and recipients. Remaining givers `G` have not picked; remaining
recipients `R` have not been drawn. A valid completion is a perfect bipartite
matching from `G` to `R` using legal edges.

A candidate `(g, r)` is available exactly when it is legal, `g ∈ G`, `r ∈ R`,
and removing both `g` and `r` leaves a perfect matching. Empty remaining sets
are a valid completion. No self-edge, exclusion or already-taken recipient is
admitted to make a difficult setup work.

If a remaining giver has a single remaining legal recipient, that recipient
is reserved for them and unavailable to every other giver. Propagate forced
choices conceptually when checking a candidate: removing one reserved recipient
may force another giver's only option. Do not commit these hypothetical edges
or expose reservations/names to clients. The giver still makes their own pick.

The perfect-matching check implements these reservations implicitly and also
catches subsets competing for too few recipients even when no list is initially
a singleton. For example, two givers limited to the same two recipients must
keep both available to that pair. This is a no-stranding guard, not probability
balancing or uniform random assignment. Two givers with the same sole recipient
mean the setup/state is impossible; never resolve it by stealing a reservation.

A simple augmenting-path bipartite matcher is sufficient at 30 people. Run it
once to validate setup and for each candidate when computing availability.
Its constructed matching is a temporary witness, never a persisted or revealed
assignment. Separate the pure boolean feasibility result from any admin-only
explanation of an invalid setup. No third-party solver/service is required.

## 2. Opening and stable slots

In one transaction, lock the current season, require setup status, validate
2–30 distinct participants and a complete matching, then create each giver's
slots over their statically legal recipients. Use a cryptographically secure
independent shuffle per giver, random opaque slot UUIDs, stable ordinal/branch
positions, and independently selected decorative colours from the four-colour
palette. Persist all of these before setting the season open.

This fixes a menu for each participant, not one recipient per participant.
Never use a shared recipient colour, recipient-derived ID/hash, global slot
number, name ordering or payload size that identifies concealed names. No
admin or participant endpoint returns the slot-to-recipient mapping.

The own-pool response returns only `slotId`, `ordinal`, cosmetic colour and
`available | unavailable`, with a mandatory season ID and monotonic draw
revision. It may include aggregate counts. Live invalidation triggers a fresh
authorised pool read; it never changes a slot's mapping. See
[realtime delivery and recovery](realtime.md).
Taken and feasibility-withheld slots share the generic unavailable presentation;
never expose which participant caused an unavailable slot. Slots never move to
fill gaps. The server may omit statically illegal recipients entirely because
they never had a slot. Refresh recomputes availability, not mapping or cosmetics.

## 3. Commit transaction

Request: `POST /api/v1/me/draw`, authenticated participant, body
`{ seasonId, slotId }`, `Idempotency-Key` random UUID. Never accept a recipient
ID, giver ID, chosen colour or a client-computed eligible pool.

All group mutation use cases lock in the same order: current season, affected
participant/wish rows, then dependent rows. Every request carries the season
ID it intends to mutate; check again after acquiring the lock.

1. Begin a database transaction and `SELECT ... FOR UPDATE` the current
   season. Require the supplied ID to match and status to be open; recheck
   session validity inside this critical section.
2. Resolve the actor/season/operation/idempotency-key receipt. Same key and
   same payload returns the previous response. Reuse with different payload
   returns `409 IDEMPOTENCY_KEY_REUSED` without changing anything.
3. If the actor already has an assignment, return `409 DRAW_ALREADY_COMPLETE`.
   The client refetches `/me/assignment`. Never present a second slot as the
   winner of that existing assignment.
4. Resolve the submitted slot scoped to this actor and season. Invalid or
   foreign slots return a generic unavailable error; do not reveal existence.
5. Read committed assignments and exclusions under the lock. Recompute the
   selected candidate's viability against this current state.
6. If not available, commit a failure receipt with `409 OPTION_UNAVAILABLE`
   and release the lock. No assignment is made. The client reloads its own
   fixed pool before a different intentional selection with a new key.
7. Insert the assignment with selected slot ID. Database uniqueness enforces
   `(season, giver)` and `(season, recipient)`; self-assignments are also
   rejected by a check constraint. Increment draw revision.
8. Insert the successful receipt containing the actor's safe response in the
   same transaction. Commit; only then return the recipient identity.

The [PostgreSQL locking rules](https://www.postgresql.org/docs/current/explicit-locking.html)
provide the serialisation mechanism. Drizzle supports explicit
[transactions](https://orm.drizzle.team/docs/transactions); use parameterised
SQL for locking where needed. An in-process mutex is insufficient across
processes or restarts. The application database user cannot bypass this flow
through a second API path. Reset/open and all participant mutations participate
in the same lock protocol.

After commit, signal the new season/draw revision to connected viewers.
Publish nothing for a rollback or rejected pick; duplicate receipt replay
creates no new revision. Event delivery is outside the transaction and cannot
turn a committed pick into a failed HTTP response. A revision reconciliation
loop and reconnect snapshots cover missed signals.

No network fetch or renderer work happens inside the transaction. Set a bounded
lock/statement timeout; rollbacks leave no successful receipt. A lock timeout
may be retried with the same key. Maintain the assignment and success receipt
atomically, including on process crash immediately after commit.

## 4. Why it remains completable

Opening proves a legal completion exists. Each accepted edge is tested after
removing its giver and recipient against the latest locked state. Therefore
the invariant that a completion exists holds after every accepted pick.
Serialisation makes this induction valid under concurrent requests. Unique
constraints provide additional protection against duplicate givers/recipients.

Example: remaining edges `A→{B,C}`, `B→{A,C}`, `C→{B}` admit a completion.
`A→B` is unavailable because it strands C; `A→C` is available. A has a real
choice only when multiple viable edges exist. The service must never accept
A's slot for B and silently give C instead.

A nonempty pool per giver is not sufficient: `A→{C}`, `B→{C}`, `C→{A,B}`
has no completion even though nobody has an empty pool. Setup must reject it.
Sequential concealed choice does not imply equal probability across all legal
full assignments, and the product must not claim that it does.

## 5. Client acknowledgement and recovery

Use explicit states: `ready → pending → committed → revealing → revealed`,
with `pending → unknown` on an interrupted response and `pending → conflict`
on a definite rejection. Only committed state starts the selected-slot cat
animation. Safe preparatory glow can show while awaiting the server.

Store only a pending draw's season/slot/key tuple in session storage for tab
reload recovery, through the approved persistence adapter. It contains no
recipient mapping or password. Clear it after reconciliation/sign-out/reset.
The server remains authoritative; a new device first queries its own assignment.

On unknown outcome, retry the same POST with the same key and payload. Querying
`/me/assignment` may recover a success, but a temporary “not assigned” response
does not prove that an earlier request has stopped. Do not unlock another
choice until the old request has a definite result. Idempotent retries converge
under the season lock. If the network stays unavailable, show a safe waiting
state rather than guessing. Season reset yields an explicit season/session
change and clears the old pending action.

On duplicate tabs with different keys, one assignment wins. The losing tab
recovers that assignment and displays a neutral “Your choice is already saved”
reveal; it does not animate its losing ornament as though it had won.
Navigation and reduced motion can skip the cat animation, but not acknowledgement.

## 6. Required proof tests

- Exhaustively enumerate small directed exclusion graphs (up to four people)
  and compare viable candidates with a brute-force permutation oracle.
- Randomised cases through 30 people: every accepted prefix has a completion;
  no self/excluded/duplicate edge; completing all givers yields a permutation.
- Single-option reservation, cascading reservations, two givers with the same
  sole recipient (reject), and a two-giver/two-recipient reserved subset.
- Explicit Hall-deficient graph above, two-person draw, one remaining candidate,
  all-but-one exclusions, and valid reciprocal cycles.
- Pool refresh, reauthentication, language/branch changes and a second device
  preserve each slot's mapping/ordinal/colour. Client JSON never contains it.
- Two real database connections try the same recipient; exactly one commits.
  The other gets a safe conflict, retaining its existing slots.
- Two legal-at-read-time picks become incompatible together: serialised
  rechecking accepts only a prefix that still has a completion.
- Same actor with same/different idempotency keys, crash after commit, lost
  response, invalid/foreign slot IDs, stale season, and simultaneous reset.
- Check all participant/admin responses and production bundles for mapping
  leaks. Feasibility explanation is available only in setup, before any picks.

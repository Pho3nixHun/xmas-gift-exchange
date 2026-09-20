# The little winter house — product specification

Version 2 · 20 September 2026 · implementation planning draft.

This is the product contract for the chosen Winter House experience. It
supersedes the original draft and the alternative design studies. The
[UX/UI specification](ux-ui.md) defines its presentation; the
[architecture](engineering/architecture.md) defines its implementation.
New recommendations are identified in the [decision register](decisions.md).
This draft does not imply their approval or that production is implemented.

## 1. Product and audience

A private Christmas gift exchange for one family or friendship group of
roughly 5–30 people. Participants visit a living, snowy miniature house,
choose a concealed ornament, discover their recipient, and leave wishes on
paper. Other givers quietly mark gifts they intend to buy.

The house is the interface: the door welcomes, the tree holds the draw,
the mantel letter holds your person's wishes, the desk holds your own,
and the family board holds everyone else's. Small acts of mischief make
it worth lingering without making the tasks harder.

Design for Anna organising twenty relatives, Péter returning to check his
recipient, Kata buying an extra gift for someone else, and Nagyi using a
small phone in Hungarian. No email address or installation is required.

## 2. Scope and ownership

One deployment has one group and one current season. A season is either
`setup` or `open`; reset replaces it with a new setup season. There is no
archive or end-of-season assignment reveal in v1.

| Data                                                    | Authority                              |
| ------------------------------------------------------- | -------------------------------------- |
| Roster, directed exclusions, season status              | Organiser through the server           |
| Passwords, sessions, hidden slots, assignments          | Server only                            |
| Wishes                                                  | Their author, enforced by the server   |
| Claims                                                  | Claiming giver, enforced by the server |
| Language, guidelines dismissal, sound/motion choices    | This device                            |
| Camera, unfinished writing, sleeping cat, eaten cookies | This visit                             |

The prototype's browser-local passwords, recipient mappings and sample
claims are demonstration data. None is migrated into production.

## 3. Non-negotiable rules

- **INV-01:** Nobody draws themselves or a directed exclusion.
- **INV-02:** Each giver draws once; each recipient has one giver when the
  draw completes. An individual selection is irreversible.
- **INV-03:** The selected concealed slot determines the recipient. Its
  mapping is fixed before selection and never rerolled or substituted.
- **INV-04:** Every successful pick leaves a complete legal assignment
  possible for everyone still waiting. Simultaneous requests cannot break this.
- **INV-05:** Only the authenticated giver receives their assignment. No
  participant or organiser API exposes the complete assignment map.
- **INV-06:** A wish's owner never receives buyer identity, claim timestamps
  or a purchase-status badge. The owner does receive edit/delete capability;
  a claimed wish is locked. This intentionally permits inferring that a wish
  was claimed and supersedes the earlier absolute claim-secrecy requirement.
- **INV-07:** Only the author edits/deletes a wish. Anyone else in the group
  may claim it; at most one claim exists; only that claimer releases it.
  While a claim exists, the author cannot edit or delete the wish.
- **INV-08:** A network retry never causes a second draw or duplicate wish.
- **INV-09:** Closing a stack, changing language, losing WebGL, or changing
  device does not change an assignment or a concealed slot's meaning.

Secrecy is enforced by server-side authorisation, not hidden UI. The service
operator with database/server access remains trusted. The organiser is also
trusted when issuing password-recovery links, which could otherwise be used
to take over an identity. First-time name enrolment relies on family trust; this is not verified real-world identity.
Inference from a tiny group or relatives sharing picks cannot be prevented.

## 4. Functional requirements

### FR-01 — Organiser setup

The organiser uses a separate authenticated `/organiser` entry, absent from
participant navigation. Being unlinked is not its access control.

Add, rename and remove participants; names must be distinguishable. Enter
directed exclusions, with an explicit action to add the reciprocal one.
Self-exclusion is automatic. Show a readable review before opening.
Support 2–30 participants, targeting 5–30 in normal use.

Opening validates a complete matching, not merely that each person has a
nonempty pool. Invalid setups remain editable with actionable explanation.
Opening locks roster and exclusions. It creates concealed choices, not
predetermined assignments.

Reset requires an explicit destructive confirmation naming the consequences.
It clears assignments, slots, wishes, claims, previews, seasonal mutation
receipts, all participant passwords and recovery tokens; it revokes participant
sessions and returns to setup. Roster and exclusions remain. Every name becomes
unprotected and can be claimed again when the new season opens. The organiser's
credentials remain separate. Backups expire according to the retention policy.

### FR-02 — Arrival, identity and return visits

The single door tooltip invites the visitor to walk to the doorstep. Identity
selection happens there, before entering; the furnished room is already visible.
Before the season opens, show a warm waiting message without exposing the roster.

Choose a roster name. The first visitor claiming an unprotected name sets a
password; a protected name requires that password. Concurrent enrolment has
one winner. Proposed password policy: 8–128 Unicode code points, spaces and
paste allowed, no composition puzzle; suggest a memorable phrase.
Never retain the submitted password in browser storage.

Successful authentication creates a remembered server session. Returning
participants with a pick open their person's mantel stack; those without one
arrive in the room with the tree highlighted. They may write wishes before
drawing. Proposed session lifetime: 120 days, with earlier expiry on reset,
sign-out, or revocation. Sign-out removes private client state and drafts.

Password recovery is required in v1. Proposed flow: “Forgot your password?”
explains how to contact the organiser through the existing family channel.
The organiser verifies the person and issues a short-lived, single-use recovery
link, shared privately. The participant sets a new password and signs in again.
Recovery preserves their assignment, fixed slots, wishes and claims; it revokes
old sessions on completion and never opens the name to public enrolment.
See the [recovery contract](engineering/account-recovery.md). This is distinct
from a full season reset, which clears everyone's passwords.

### FR-03 — Genuine concealed draw

The tree offers red, purple, blue and gold ornaments. Their appearance is
randomised independently of hidden names; a colour never identifies a person.
An available slot's ID, recipient and visual placement stay stable across
refreshes, language changes, pagination and devices within the season.

If a remaining giver has exactly one legal remaining recipient, reserve that
recipient for them: nobody else may select it. Keep this reservation hidden and
recompute it as choices narrow, including cascading forced choices. Reservation
is not an automatic pick: that giver still chooses their concealed ornament.
There is no requirement to equalise odds or sample full matchings uniformly.
The feasibility check implements this protection and also rejects conflicting
reservations or combinations that would leave somebody without a recipient.
Only choices that keep the remaining draw solvable are selectable. Taken and
otherwise unavailable slots are muted; never explain whose pick caused an
option to disappear. Show available count and aggregate unavailable count,
not a named progress report. Some people will have only one legal option.
Equal statistical odds across complete assignments are not promised.

Display the finality warning before interaction. One tap commits immediately,
with no additional confirmation. Lock repeated interaction while pending.
Only a successful server response authorises the cat's leap and name reveal.
The cat fetches the exact selected ornament. The animation can be skipped;
reduced motion reveals immediately. Continue to the mantel wishes.

While participants are at the tree, live availability updates dim slots that
are no longer selectable, including choices that would now strand another
participant. Keep slot positions/colours fixed and reveal no other person's
identity. Target updates within one second of a committed pick on a healthy
connection. This reduces stale selections; it cannot remove the last instant
of a simultaneous-click race. Server transaction checks remain authoritative.

A stale selection can fail without choosing anything: refresh availability
without remapping slots and invite another choice. An uncertain response
must be recovered before enabling another pick. A completed pick is recovered
after reload or on another device without making a new draw.

### FR-04 — Own wishes

The desk holds your paper stack. Add/edit directly on its top sheet with real
HTML form controls positioned on the paper. The lamp is on throughout a desk
visit, including browsing, saving and cancelling.

Each wish has a required plain-text description (1–500 Unicode code points
after trimming), optional HTTP(S) URL (maximum 2,048 characters), priority
`low | medium | high`, creation time, and stable ID. Default priority is medium.
Three square, pencil-style choices look like checkboxes but select exactly
one value using native radio semantics.

No product limit on wish count; fetch lists in pages. Order by creation time
then stable ID, never by priority. Saving immediately shares the wish.
A claimed wish cannot be edited or deleted. Enforce this on the server under
the same lock as claims, not just with disabled buttons. Return owner-facing
`canEdit`/`canDelete` capabilities and a quiet locked message without naming the
buyer. The owner can infer a claim from the lock; this is an accepted consequence
of this rule. Proposed release behavior: when the claimer releases it, editing
and deletion become available again. Givers must claim the content version they
reviewed; a concurrent edit requires them to refresh before claiming.

Unsaved writing remains in memory when stepping away or switching language.
Cancel explicitly discards that editor's changes. Browser reload/sign-out
does not promise draft recovery. A failed save retains the draft and explains
how to retry. Delete asks a short confirmation on the paper.

### FR-05 — My person and everyone

The sealed mantel letter opens only your assigned recipient's stack. An
empty list invites a later visit and offers the guidelines.

The family board displays **names only**, excluding your own name; no wish
counts or claim badges on physical cards. Select a name to lift that person's
stack from the board. The tree and board remain comfortable at 30 people.
Read one wish at a time with buttons, keyboard or swipe; all methods are
equivalent. Stack paging shows position, and links open safely in another tab.

Click outside a stack, close it, or press Escape to return to the room.
Browsing the board never changes your assignment. Your own stack remains at
the desk rather than appearing beneath your recipient's wishes.

### FR-06 — Gift claims

“I'll take care of this” records an intention to buy; there is no separate
payment, purchase verification or delivery state. A giver sees `available`,
`mine`, or `claimed`. Only `mine` has a release action. Other claimers' names
are never shown. All participants can coordinate on all other participants'
wishes, whether or not assigned to them.

The server decides races. On conflict, update that sheet and explain that
someone is already taking care of it. Never optimistically promise success.
Detailed claim status, buyer identity and timestamps remain absent from owner
representations. Only edit/delete capabilities disclose the required lock.

### FR-07 — Link previews

Preview an optional product link asynchronously while composing and reading.
Extract title, site, image and optional price/currency/availability when safely
obtainable. Price is a dated hint, not live stock or a promise. Missing fields
simply disappear. No retailer API, scraping browser or affiliate integration.

A failed, blocked or slow preview never prevents saving/reading the wish.
Description and plain link remain usable. Cache previews within a visit;
backend cache and strict outbound-fetch limits are specified in engineering.
No third-party request runs directly from a reader's browser for previews.

### FR-08 — Language, guidelines and utilities

Provide native-feeling Hungarian and English throughout, including errors,
screen-reader labels, organiser tools, loading facts and empty states. Start
with the saved language; otherwise use the first supported browser preference;
otherwise Hungarian. Switching preserves the task, selected slot and writing.

Guidelines cover thoughtfulness, experiences, avoiding filler and a locally
written budget. Reuse the [guidelines recovered from git history](content/README.md):
Hungarian 15,000–20,000 Ft and English $30–60 (or local equivalent). Preserve
the existing advice; these are locale-specific copy, not live conversion. Guidelines remain available beside wishes and through the menu;
remember dismissal per device.

Sound is off by default and starts only after explicit interaction. Offer
ambient-motion pause, refresh, language and sign-out. A utility menu also
provides accessible destinations without introducing bottom tabs. Draw availability
updates automatically while choosing. Reconnect refreshes current availability;
if streaming is unavailable, use short polling while the tree is visible. Manual
refresh remains available and is the v1 mechanism for wishes/claims; refetch after
successful mutations and conflicts. Refresh must not overwrite an open draft.

### FR-09 — Atmosphere and resilience

Preserve the burning fireplace, drifting window snow and occasional street
light, snowy surroundings, glowing desk lamp, cat nap, consumable cookies,
snowman, snowballs, visible Santa and prominent shooting star. Decorative
actions are local to the visit and cannot alter exchange data.

Loading shows truthful progress and short sourced Christmas facts, including
Hungarian traditions. Never delay a ready app to force someone to read trivia.
WebGL failure or a chosen simple-view setting exposes the same core tasks in
accessible HTML using the same authenticated backend. It is a production
alternative renderer, not a second data store or the legacy demo fallback.

Installable home-screen metadata is in scope; offline exchange operations
are not. Network failure leaves a readable explanation and retry path. No
offline draw, queued claim, or private-data service-worker cache.

## 5. Experience and quality requirements

- Primary family devices are high-end Android phones and iPhones. Test on
  physical Android Chrome and iOS Safari; desktop remains supported.
- Phone-first from 320 CSS pixels to wide desktop, including landscape,
  notches, touch, browser zoom and the on-screen keyboard.
- WCAG 2.2 AA target: at least 44 × 44 CSS-pixel action targets as a product
  standard, readable contrast, keyboard completion, announced status, visible
  focus, and no meaning carried only by colour, motion or sound.
- Reduced motion skips travel/action animation and freezes ambient movement.
  Ambient pause must not break intentional navigation, forms or lamp state.
- Private data is absent from public bundles, diagnostics, telemetry and logs.
- API correctness and privacy are release gates, even for this small group.
- Performance budgets and browser/device checks live in the engineering plan;
  software-rendered prototype screenshots are not mobile performance evidence.

Deploy on the owner's server from a GitHub checkout using a configurable
Docker stack. Host/domain, secrets, service settings and public editorial
content are deployment configuration; see [operations](engineering/deployment.md).

## 6. Out of scope

Multi-group hosting, simultaneous seasons, archives, messaging, notifications,
payments, shopping carts, assignment exports, organiser draw-progress reports,
live wish/claim updates, wish reordering, price tracking, and HTML-in-Canvas.
Live draw availability is included in v1. Experimental
canvas forms can be revisited in a later season.

## 7. Success and acceptance

Aim for over 90% of participants drawing without help, over 80% adding a wish,
a median first draw under two minutes, and organiser setup under ten minutes
for twenty people. Evaluate with a family rehearsal, not invasive tracking.
Zero application-caused assignment disclosures and duplicate claims are
release criteria. Zero duplicate gifts is the aspiration; the app cannot
account for purchases people never mark.

Each FR and invariant maps to gates in the [delivery plan](implementation-plan.md).

# Implementation status

Updated 21 September 2026. The application implementation is connected end to end.
The approved procedural Winter House remains the visual source. Real family
setup/opening and the physical-device/public-ingress launch rehearsal remain
operator actions; development never opens a real season automatically.

## Implemented

- Angular 21 standalone/zoneless components, Angular Three, Signal Forms and
  NgRx SignalStore, strict functional TypeScript, default-deny dependency layers,
  Prettier and zero-warning ESLint. One npm lockfile and Docker image.
- The prototype's cottage, landscape, furnished room, coloured ornaments,
  responsive camera paths, cat leap/nap, cookies, fire/window shaders, desk lamp,
  snow, snowman, snowballs, Santa and shooting star.
- Doorstep identity/enrolment/login, returning-session mantel, names-only board
  with eight-card pages, board/mantel paper stacks, seven-ornament branches,
  seated desk notebook and forms on its projected paper.
- Prototype fidelity pass: 27 background homes, full-height firs, clear sled and
  snowman paths, individually switchable lanterns and eaves, and varied Santa
  and shooting-star trajectories. The doorstep uses the prototype's name cards.
- Board names remain visible from the room. Cat/cookie interactions are discovered
  on the objects; the cat roams between the fireplace, tree and rug and responds
  with the prototype toast. The tree star throws a brief burst of spikes.
- Choosing a person removes subsequent draw invitations. Paper lifts from the
  selected board card, mantel envelope or desk notebook. The desk lamp waits for
  camera arrival; the left wall stays visible. The seated right wall and the
  wall enclosing both the board and its notes fade in during camera movement
  and out on leaving. The desk lamp still waits for seating to finish.
  Clicking outside interior zooms returns to the room.
- The gift agreement is a native disclosure on the note paper, between wish
  actions and page controls. It scrolls with the paper, supports keyboard
  operation, and replaces the floating corner control.
- Bounded mouse/touch camera dragging and gentle pointer parallax match the
  prototype's look-around interaction. Drag releases do not trigger furniture.
  The desk tooltip follows the writing chair; the doorway card has the original
  red/green border and paper fold. The cat has smoother proportions, body-attached
  stripes and coordinated paws. Shooting stars appear only outside.
- Room overview heading/subtitle removed so the scene and object labels remain
  unobstructed.
- HU/EN, three native radio priorities styled as boxes, saved view/language
  preferences, pause, reduced motion, hidden-tab suspension, optional sound and
  chewing, sourced loading facts and simple view/context-loss fallback.
- Browser-language selection, standalone home-screen metadata/icons, an accessible
  destination menu, manual note refresh, stable sheet selection, keyboard/swipe
  paging and explicit draft discard. Rendering reduces resolution under sustained
  frame pressure within the configured DPR cap.
- Fastify/PostgreSQL accounts and opaque sessions, separate organiser role,
  Argon2id passwords with bounded workers, CSRF/origin checks, strict schemas,
  rate limits, safe error codes, CSP and generated OpenAPI.
- Directed exclusions and a pure feasibility solver, stable concealed slot
  mappings, season-row-locked draw commits, assignment constraints, mutation
  receipts and interrupted-response reconciliation. Only a committed selection
  starts the corresponding cat action.
- Authorised SSE invalidation with heartbeat, database revision reconciliation,
  bounded streams, revocation checks and browser polling fallback.
- Persisted wishes, optimistic versions, private claim/release and transactional
  edit/delete locking. Owners never receive buyer identity, claim timestamps or
  detailed claim state, including through the other-member endpoint.
- Viewer/season-bound private responses discard stale requests and clear private
  room state when another tab changes the signed-in family member.
- Organiser setup/validation/open, private one-use recovery links, generation-bound
  redemption/session revocation, and explicit idempotent reset that clears
  passwords and content while retaining the roster/exclusions.
- Optional isolated **text** link previews: pinned public DNS, redirect/size/time
  bounds, plain title/site metadata, bounded queue and seasonal cache. Disabled
  by default; remote images are not fetched. Saving remains independent.
- Three reviewed Drizzle migrations, configurable Docker deployment, private
  database volume, organiser hash tooling, runtime public editorial settings,
  proxy example, maintenance mode and [operator runbook](operator-runbook.md).

## Verification

- 83 unit/contract/HTTP/store/projection/animation checks pass. Matching is compared against a
  permutation oracle for all 4,096 four-person directed exclusion graphs, with
  a full 30-person completion test. Preview guards cover private/mapped/reserved
  IPs, alternate IP spellings, local hosts, userinfo and custom ports.
- Real PostgreSQL integration tests create/drop a uniquely named disposable
  database. They cover duplicate draw receipts, complete draws, claim races,
  owner privacy, claimed-wish edits, recovery replacement/concurrent redemption,
  preserved assignments, session invalidation, reset replay and concurrent
  enrolment after reopening.
- Real HTTP SSE tests cover anonymous rejection, initial readiness, post-commit
  invalidation, safe event payloads, logout closure and thirty simultaneous
  authenticated viewers. The local 30-viewer p95 gate is under one second;
  this does not certify an untested public reverse proxy.
- Ten Chromium journeys pass together: persisted wishes and draft/language/view retention;
  320px forms and real WebGL loss; motion and pause; a lost draw response after
  commit; board stacks and private claim/release; organiser-assisted recovery,
  fragment scrubbing and single-use redemption; cross-tab identity changes;
  home-screen assets and browser-language selection; a failed startup request and
  accessible retry; physical light switches, visible room cards, the cat toast
  camera dragging and click-outside exits from tree, board and desk. Note checks
  include the agreement disclosure, manual refresh preserving the selected
  sheet, arrow/swipe paging and draft discard.
  Reduced-motion checks preserve
  native controls and focus. The normal-motion entrance is exercised too.
- A browser-run scene probe checks lamp/wall timing, paper settlement, star-burst
  lifetime, the cat's three destinations, snowman clearance, sky direction
  variation and full-height fir geometry. Doorway, room, seated desk and desktop/
  phone paper views were also inspected. The rebuilt Docker scene loads without
  browser errors; the app and database health checks pass.
- Native touch input at a phone viewport verifies camera movement, angular
  limits and suppression of accidental clicks. Wall timing and shooting-star
  visibility are checked across interior stages. Fade tests cover intermediate
  opacity, direction reversal, material isolation and reduced motion.
- Production build, strict type checks, lint ratchet and documentation references
  pass. The build keeps the room and Three.js lazy. Initial estimated transfer
  is about 77 kB; account/recovery pages do not instantiate the 3D scene.
- Encrypted backup/restore rehearsal uses the disposable browser database, with
  integrity verification before restore and session revocation in the copy.
  No real family data or prototype browser storage is imported.

## Launch gates that require the actual environment

Configure the real family and exclusions in `/organiser`; validate and open the
season deliberately. Configure the organiser contact, own-server HTTPS ingress,
backup destination/schedule and retention. Leave previews disabled until outbound
network restrictions are configured. Run one API process.

Rehearse on current high-end Android and iPhone devices, including native soft
keyboards, 200% text, VoiceOver/TalkBack, sustained GPU/battery behaviour and sound
activation. Check actual HTTPS cookies, public-ingress SSE latency, proxy restart
and a family-group simultaneous draw. Review Hungarian copy with a native speaker.
Desktop/software-rendered Chromium cannot prove these device and hosting gates.

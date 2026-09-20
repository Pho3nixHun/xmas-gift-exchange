# Decisions and review points

20 September 2026. “Agreed” records user decisions from design work;
“proposed” is the recommendation in this documentation pass. This is a
reviewable implementation plan, not a claim that it has been implemented.

## Agreed product direction

| ID   | Decision                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Build the interactive Winter House, not the static alternative layouts.                                                                              |
| D-02 | Use scene travel and in-world targets; remove the obstructing right wall and bottom tabs.                                                            |
| D-03 | One door action; choose identity on the doorstep before entering the furnished room.                                                                 |
| D-04 | Multicolour glowing ornaments; the cat fetches the chosen ornament.                                                                                  |
| D-05 | Family cards show names only; wishes are interactive paper stacks.                                                                                   |
| D-06 | My person opens the letter/notes at the fireplace; own wishes live at the seated desk.                                                               |
| D-07 | Real HTML forms sit on the paper; defer HTML-in-Canvas. Three priority choices replace the select.                                                   |
| D-08 | Keep the lamp, living fire/window, snowy landscape, cat nap, cookies and outdoor surprises.                                                          |
| D-17 | Live draw availability is in v1 so a group joining together sees unavailable ornaments dim promptly; server checks still resolve simultaneous picks. |
| D-09 | Write coordinated product, UX/UI and engineering docs first; adopt the reference project's coding and formatting standards.                          |

## Proposed technical baseline

| ID   | Recommendation and reason                                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-10 | Angular 21.2 + Angular Three 4.2.4 + Three.js 0.182.0; matches the reference's declared peers. Verify exact patch set in the first build.                                                                                         |
| D-11 | NgRx SignalStore, standalone OnPush components, SCSS and native controls. Preserve the reference's Signal Forms direction, isolating its experimental Angular 21 API behind presentational form components.                       |
| D-12 | Node 24 LTS + Fastify 5 + PostgreSQL 18 + Drizzle + Zod. A small modular service with explicit SQL transactions fits the scale and functional coding style.                                                                       |
| D-13 | npm workspaces and Angular CLI; Vitest and Playwright. Draw updates use Server-Sent Events in the existing Fastify API. No separate realtime service, Redis or message broker; Nx and NestJS are also unnecessary for this scope. |
| D-14 | Reproduce the reference's formatter/linter rules locally using public tools. Do not require its private Gravity packages, corporate theme or registry.                                                                            |
| D-15 | Server-enforced secrecy, opaque remembered cookie sessions, real matching checks and season-serialised mutations. Operators with infrastructure access remain trusted.                                                            |
| D-16 | CSS-projected semantic HTML over physical paper, with a complete simple HTML view using the same stores/API. WebGL2 baseline; WebGPU is not a dependency.                                                                         |

Angular 22 is available, but the inspected Angular Three package declares
`@angular/core/common >=20 <22` and `three >=0.157 <0.183`. Do not bypass
peer constraints with `--force`. Moving to a newer compatible family is a
deliberate update after a rendering/form spike, not an incidental upgrade.
See the [version evidence](engineering/architecture.md#version-evidence).

Realtime is a product requirement (D-17); SSE is the proposed transport. See
the [realtime contract](engineering/realtime.md). Initial scope is draw
availability; live wishes/claims remain deferred.

## Confirmed changes from review

These replace the earlier proposed defaults. Mechanism details remain concrete
engineering proposals where the user specified the outcome rather than a flow.

| ID   | Decision                                                                                      | Implementation consequence                                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-18 | Password recovery is required; forgetting passwords caused problems last year.                | Propose organiser-issued, private, single-use recovery links; preserve all exchange data.                                                                         |
| D-19 | A full season reset makes every participant name claimable again.                             | Clear participant password hashes and recovery tokens, revoke sessions, retain roster/exclusions.                                                                 |
| D-20 | Claimed wishes cannot be edited or removed.                                                   | Atomic server lock check plus owner capabilities; the lock reveals a claim indirectly, superseding strict claim-state invisibility. Buyer identity stays private. |
| D-21 | Protect a giver whose remaining list has only one name. No probability-balancing requirement. | Reserve their only recipient, propagate forced constraints; full matching validation catches impossible combinations without preassigning results.                |
| D-22 | Deploy from GitHub onto the owner's own server with Docker; settings configurable.            | Versioned deployment files, runtime public config, environment/secret inputs and a repeatable upgrade runbook.                                                    |
| D-23 | Reuse last year's budgets and guidelines.                                                     | Restore exact `rules` content from commits `1f5f26d` / `78a9197`: HU 15,000–20,000 Ft; EN $30–60 (or local equivalent).                                           |
| D-24 | Family uses high-end Android phones and iPhones.                                              | Physical flagship Android Chrome / iOS Safari are primary release devices; responsive and simple-view support remain.                                             |

## Concrete defaults still proposed

- Recovery links last 30 minutes; only the latest unused link for that person
  is valid. The organiser shares it manually after verifying identity.
- Releasing a claim unlocks that wish for its owner again.
- Passwords allow 8–128 code points; remembered participant sessions last
  120 days. These policy values are deployment configuration with validation.
- Docker Compose is the proposed single-server packaging. No managed hosting
  provider or external email/realtime service is required.
- Encrypted daily backups expire after seven days; confirm backup location and
  concrete domain/proxy/device models when configuring the server.

The organiser's recovery authority is a trust boundary, not a promise that a
malicious organiser cannot impersonate someone through a reset link. Normal
organiser APIs still expose no assignment map. The [recovery contract](engineering/account-recovery.md)
and [deployment contract](engineering/deployment.md) specify the details.

Names still use family-trusted first enrolment; no email or invitation code is
introduced. Nothing in this documentation pass pushes to GitHub or deploys.

## Explicit departures from the reference codebase

Preserve its rules, not its industrial map architecture or dependencies.
Use `wh-` component selectors and Christmas feature boundaries. Add explicit
mutation commands beside resource-based reads; this application writes shared
state, while the reference primarily loads data. Keep backend I/O in adapters.
Start lint warning counts at zero, not at the reference's existing debt.
Runtime browser APIs need support checks even where `ESNext` typings compile.

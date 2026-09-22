# The little winter house

The chosen direction is a living 3D Christmas house. These documents turn
the approved interaction prototype into a plan for a real shared application.
The Angular/Fastify application is now connected end to end; see the
[startup instructions](../README.md), [operator runbook](engineering/operator-runbook.md) and
[implementation status](engineering/implementation-status.md).
The [rendering review](engineering/performance-review.md) records measured scene
costs, optimizations and the remaining physical-device performance checks.

## Read in this order

| Document                                                  | Purpose                                                           |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| [Product specification](spec.md)                          | Audience, scope, features and privacy invariants                  |
| [UX/UI specification](ux-ui.md)                           | Journeys, room navigation, paper forms, motion and accessibility  |
| [Architecture and stack](engineering/architecture.md)     | Angular/Angular Three frontend and Node backend structure         |
| [Account recovery](engineering/account-recovery.md)       | Password recovery without losing the draw; full-reset distinction |
| [Deployment and configuration](engineering/deployment.md) | Own-server Docker stack, settings and release workflow            |
| [Existing gift guidelines](content/README.md)             | Exact HU/EN rules and budgets recovered from git history          |
| [Data and API](engineering/data-api.md)                   | Storage, permissions, contracts, sessions and operations          |
| [Realtime draw updates](engineering/realtime.md)          | SSE delivery, reconnects, privacy and polling fallback            |
| [Draw protocol](engineering/draw-protocol.md)             | Real concealed choice, feasibility and concurrency                |
| [Sound effects](engineering/audio-assets.md)              | Recorded clips, edits, playback and motion timing                 |
| [Coding standards](engineering/coding-standards.md)       | Standards adopted from the reference Angular project              |
| [Implementation plan](implementation-plan.md)             | Ordered work packages and release checks                          |
| [Decisions](decisions.md)                                 | Agreed behavior, proposed defaults and remaining review points    |

The product specification governs behavior; UX/UI governs presentation.
Engineering must satisfy both. If the demo conflicts with a written production
requirement, the production requirement wins. Resolve future disagreements
in these docs before implementing competing behaviors.

## Try the design

From the repository root:

```sh
npx http-server docs/prototypes -c-1
```

Open the printed server address, then `/winter-house/` if needed. The folder
is **prototypes**, plural. Use HTTP rather than opening the file directly.
See [prototype notes](prototypes/winter-house/README.md) for interactions and
known limits. Its recording is illustrative and may lag the live prototype.

The old seven-direction UX/UI studies, snow-globe specification, comparison
page and rejected letter/baking prototypes have been removed. The approved
3D house, village artwork and existing illustrated WebGL-failure fallback
remain. The fallback is historical demo support, not another product direction
or the proposed production simple view.

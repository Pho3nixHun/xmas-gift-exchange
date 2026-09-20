# The little winter house

A real-time 3D prototype of the participant experience in [the product spec](../../spec.md). This is the chosen visual and interaction direction. Production behavior is specified in the [documentation index](../../README.md); demo storage and authentication must not be reused.

```sh
# From the repository root
npx http-server docs/prototypes -c-1
```

Open the server URL. `docs/prototypes/index.html` redirects here. Alternatively open `/winter-house/` directly. An HTTP server is required for JavaScript modules; no build or npm install is required.

[Watch a recorded walkthrough](watch.html), or open [the live experience](index.html). The recording may lag recent interactions; use the live prototype and UX/UI specification for review. The video is loaded only on the separate recording page.

## The experience

- **Outside:** a miniature snow-covered cottage on an island, warm windows, pine trees, fence, sled, lanterns, footprints, chimney smoke, and falling 3D snow. Drag to orbit gently, or use the arrow keys while the scene has focus.
- **Walk:** a single “Knock, knock” label sits on the physical red door from the opening scene. The camera walks to the doorstep, where you choose your name and enter a password. The room and cat are already present when the door swings open; the camera then crosses the threshold.
- **Inside:** a furnished cutaway room with a burning fireplace with changing flame silhouettes, floating embers and flickering light, stockings, wingback chair, tea and biscuits, woven rug, tree, writing desk, and family noticeboard. The right wall is open, the camera frames the room more closely on wide screens, and a muted snowy landscape surrounds it. The desk sits at the front-right; a sealed letter on the mantel opens “My person.” Floating labels on the room’s objects replace the bottom navigation tabs; camera moves keep their spatial relationship.
- **Draw:** choose a red, purple, blue, or gold ornament. Colors are randomized independently of hidden recipients and persisted with each slot. Available ornaments gently sway, glow, and have a visible focus/touch halo; unavailable ones stay muted. This follows the updated visual direction, while preserving fixed option-to-name mapping. The camera pulls back to show the cat crouch, leap toward that exact ornament, jostle the tree, and land. The recipient follows the selected slot. A reveal keeps the room alive behind it.
- **Bigger families:** the tree rotates to show six ornaments at a time. Each slot keeps its identity and position around the tree. This allows a 30-person roster without miniature touch targets or an overlaid grid of tiny names.
- **Family board:** only names appear on the pinned cards. Click a name to lift their paper stack forward; browse one wish per sheet using arrows, keyboard arrows, or a horizontal swipe. Larger families have pages of eight names, with large paging targets.
- **Your person:** clicking the physical mantel letter or its “My person” label zooms into the fireplace and brings the recipient’s notes forward from the envelope. Returning sessions reopen that stack at the mantel. The family board remains a separate place to browse everyone.
- **Writing:** the camera curves around the writing desk and settles into its wooden chair, close to the desktop, before lifting the paper. The chair has a cranberry cushion and a broad wooden back. The lamp, pencil and tabletop frame your own stack. Arriving at the desk switches on its lamp, with a warm bulb, glowing shade and a pool of light on the tabletop. It stays lit while browsing, adding or editing wishes, including after saving or cancelling; leaving the desk switches it off. Adding and editing replace the top sheet with real HTML form controls printed onto the paper; there is no separate modal or experimental HTML-in-Canvas dependency. Unsubmitted text is kept in memory when you step away and restored when you reopen the same editor. The camera adapts to the visual viewport when a mobile keyboard opens. Three pencil-style checkboxes select one priority; the controls use native radio semantics for keyboard and screen-reader support.
- **Wish interactions:** add, edit, remove, claim, and release wishes. Owners see no claim controls or claim status on their own lists and are excluded from the family board. Click outside a stack, tap its ×, or press Escape to return to the room.
- **Outdoor surprises:** a snowman strolls past, snowballs occasionally arc between background houses, a larger Santa and sleigh cross the visible sky, and a bright shooting star leaves a long golden trail. Santa’s route starts six seconds into the scene and repeats every 52 seconds, with 14 seconds per crossing. The star starts at three seconds and repeats every 28 seconds, lasting 3.6 seconds. These two distant paths adapt to the camera and viewport in the street and room views; close-up views hide them during reading and writing. They share the scene clock and freeze with ambient pause; reduced motion leaves a stationary snowman and suppresses the flying effects. They never intercept input.
- **Through the window:** two layers of drifting snow pass over soft rooftop silhouettes and a few slowly changing warm windows. An occasional passing light brightens the glass, sill and curtains. The view sits behind the physical window frame and uses the same ambient clock, including pause and reduced motion.
- **Loading:** three short English/Hungarian Christmas facts paint before scene construction, rotate on slow loads, and link to their sources. The first fact advances on later visits.
- **Small diversions:** click the green sofa (or its keyboard-accessible “Catnap” label) to make the cat crouch, hop onto the cushion and settle with tucked paws and sleepy eyes. It stays there while you visit other parts of the room and wakes up for the ornament draw. Pet the articulated cat, ring the brass bell by the door, or opt into procedural ambient sound and chimes. Sound is off until explicitly enabled.
- **Cookies:** click a cookie or its plate, or use the “A cookie?” label, to eat one of the three biscuits. It lifts away with a few crumbs and disappears. Rapid clicks during the bite are ignored; the empty plate stays empty until the prototype reloads. Chewing/crunching sounds are synthesized locally and respect the Sound toggle.
- **Utilities:** English/Hungarian, ambient-motion pause, remembered sessions, refresh, sign-out, and replay. The system reduced-motion setting makes camera/action transitions immediate and freezes ambient movement.

## Implementation

- Pinned **Three.js 0.180.0**, bundled in `vendor/` with its MIT license. No runtime dependency on a JavaScript CDN.
- All scene geometry is built in [world.js](world.js). The world uses actual meshes, depth, lighting, perspective, shadows, particles, and raycasting. The earlier generated scene images are not used as the 3D backdrop.
- Static geometry is combined by material to reduce draw calls. The cat, door, ornaments, live flames, candle flames, and interactive props keep independent transforms.
- The fireplace uses a small procedural flame shader and twelve rising ember sprites; ambient pause and reduced motion freeze them. Snow uses a particle shader with procedural movement; smoke and steam use small reusable procedural sprite textures. Wood grain is drawn into a small canvas texture.
- The indoor window uses one small procedural shader surface and a local light without shadows; it needs no city models, image assets, or additional render target.
- One scene render target and a compact postprocess add light bleed, vignette, and subtle grain. Shadows are cached until the scene changes.
- Pixel ratio is capped at 1 on a phone-sized viewport and 1.5 on desktop initially. A sustained slow initial render lowers it to 1. Snow density starts lower for a phone-sized viewport.
- Background tabs suspend the animation loop and any enabled audio. Rebuilding the ornament set disposes of its owned geometry and sprite materials.
- Interactive DOM targets track projected 3D positions, provide visible keyboard focus and accessible names, and offer a minimum 44 × 44 CSS-pixel draw target. The named board cards and paper controls are ordinary keyboard-accessible HTML. Their CSS transforms use the same model/view/projection matrices as the physical meshes; their hit areas follow the camera. Board controls are inactive until the camera visits the board.
- [experience.js](experience.js) owns the local demo state, localized copy, paper interfaces, input, and optional Web Audio. [winter.css](winter.css) owns the projected paper surfaces, utility layout, and phone adaptations.

The renderer and geometry APIs follow the [Three.js documentation](https://threejs.org/docs/).

## Verification and limits

Verified in headless Chromium using WebGL through SwiftShader: names-only board navigation and 30-person paging, one-wish-per-sheet browsing, forms attached to the stack, draft retention across navigation and language changes, click-outside/Escape dismissal, simulated keyboard viewport fitting, and scene/module startup, mobile entrance, object/navigation camera destinations, stable pools when changing language, 44-pixel draw targets at 320-pixel width, selection-to-recipient correspondence, claim/release, wish add/edit, owner claim-state hiding, browse exclusion, empty lists, persisted return visits, and a 30-person roster with rotating branches. Separate runs exercise the camera tour, door, orbit, cat animation, seated desk approach followed by the paper lift, live-fire clock and reduced-motion behavior. Outdoor effects were sampled at active times and visually checked in the exterior sky. JavaScript errors are collected during the checks.

The test renderer is software, so its frame rate is **not a real-phone performance benchmark**. Real iOS/Android GPU, thermal, battery, Safari, and audio-device testing remain necessary before production. There is a readable fallback when WebGL initialization fails.

This remains a design prototype using local sample data. It does not implement a shared draw server, production authentication/privacy, concurrency protection, feasibility/exclusion rules, organiser tools, real link previews, or installation. Local password digests are a demo convenience; assignment data is browser-readable. Do not use this demo for a real secret exchange.

Use the menu’s **Replay from the snowy street** to clear this prototype’s sample state and experience the entrance again. The [illustrated fallback](../01-come-on-in.html) remains for prototype WebGL failures; it is not the production simple view.

## Christmas fact sources

The short, independently written fact texts are in [facts.js](facts.js): [Mikulás and boots in the window](https://visithungary.com/articles/6th-december-boots-in-the-windows), [szaloncukor](https://www.hungarikum.hu/de/node/7812), and [Henry Cole’s Christmas card](https://www.vam.ac.uk/articles/the-first-christmas-card).

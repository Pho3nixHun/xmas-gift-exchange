# Rendering review — 21 September 2026

The largest costs were repeated shadow rendering, unbatched ornament details,
full-resolution glow sampling, and HTML projection work on stationary frames.
The changes below reduce that work while keeping the town, snow, fire, cat and
interactive objects.

## Changes

- Batch compatible decoration meshes within each ornament. Keep their bodies,
  colours, glow and independent movement intact.
- Preserve shadow, visibility and render-order flags when batching. Previously,
  merging the distant landscape turned its shadow casting back on.
- Refresh animated shadows at up to 20 Hz on narrow screens and 30 Hz on wider
  screens. Scene changes invalidate them immediately. The scene, camera, fire,
  snow and other animation still render at the browser's frame rate.
- Compute soft light bleed at half width/height and composite it over the
  full-resolution scene. The former 17 full-resolution texture samples per
  pixel become approximately six equivalent samples: 16 at quarter pixel count
  plus two for the composite. This adds one small render target/pass.
- Cache stationary paper, board and tooltip projections. Refresh on camera,
  viewport, stage, transition and tooltip-content changes; keep moving ornament
  targets live. Read tooltip dimensions before writing styles. Remove the
  redundant forced traversal of every world matrix each frame.
- Stop submitting GPU draws when a paused/reduced-motion scene is unchanged.
  Camera gestures, scene changes, lights, explicit interactions and live ornament
  changes still redraw it. The lightweight frame callback remains active;
  hidden tabs retain their existing suspended frame loop.
- Downshift DPR after sustained performance below 50 fps, with startup warmup
  and a floor of 0.75. Previously it waited for less than 35 fps and excluded
  frames slower than 250 ms, which could conceal the worst overload.

## Follow-up — idle frame cost, merge width and a wasted buffer

- Skip the ambient pose unless the clock, room visibility or chimney visibility
  changed, or something invalidated the frame. A paused or reduced-motion house
  recomputed the same sines for every ember, steam puff, twinkle, flame and
  bauble on every frame, then wrote back the pose those props already held.
- Pose the fireplace, tea steam and baubles only while the room is visible, and
  the chimney smoke only while it is. Both were animated indoors and out alike.
- Drop the duplicated bauble aura write. `animateAtmosphere` set an opacity that
  the scene component overwrote in the same frame with the value that accounts
  for slot availability, so the first write could never be seen.
- Index rather than expand geometry when merging. Three's primitives arrive
  indexed and only extrusions do not, so normalising each bucket to non-indexed
  inflated every merged box from 24 vertices to 36. A unit check now guards this.
- Ask for a canvas without multisampling. The house is composited through its own
  render target, so the default framebuffer only ever receives one fullscreen
  quad, and its multisample buffer was allocated and resolved for nothing. This
  does not change how the scene looks: it is not antialiased either way. Adding
  `samples` to the composite target is a separate, unmade quality decision.
- Look anchors up through a map into one scratch vector. The previous lookup
  built an entries array and cloned a vector for every pinned label on every
  projected frame, which is every frame during camera travel.

## Follow-up — instanced ambient particles

The embers, tea steam and chimney smoke were 25 individual sprites: Three submits
one draw call per sprite, and the frame callback walked each group every frame
writing a position, a scale and an opacity per particle. Each group is now one
instanced billboard field whose whole motion is a function of a single clock
uniform, so 25 draw calls become 3 and the browser does no per-particle work at
all. The motion formulas are ported unchanged; the fields keep their original
parents, blending and texture.

Twinkles, bauble auras, lamp and window glows stay as sprites for now. They are
not interchangeable with these three: the lantern and eaves twinkles are
individually switchable through their materials, and the auras change colour with
draw availability, so both need their per-object state threaded into instance
attributes before they can join a field.

All twelve browser journeys pass against these changes, including the pause test
that holds the room still for thirty seconds and the scene probe that switches
lights, pets the cat and leaves each interior zoom. The instanced shaders compile
and run under software WebGL.

The per-frame callback is still registered with `frameloop="always"`; the scene
decides internally whether to submit draws. Moving to `demand` would require an
`invalidate()` at every interaction, preference, ornament and projection change,
where one omission freezes the house, so it stays as a measured decision rather
than a refactor made blind.

## Scene workload comparison

Same constructed scene, 390 × 844 viewport, DPR 1, mobile geometry and shadows.
Counts include shadow and post-processing passes. Baseline regenerated shadows
every frame. Updated counts average 24 frames at a simulated 60 Hz with the
20 Hz shadow schedule. Camera poses and visitor visibility are identical between
runs. This is a renderer workload comparison, not a physical-device FPS result.

| View    | Draw calls before | Draw calls after, average | Triangles before | Triangles after, average |
| ------- | ----------------: | ------------------------: | ---------------: | -----------------------: |
| Outside |               382 |                       259 |          154,096 |                   98,289 |
| Room    |               559 |                       314 |          170,992 |                  109,079 |
| Desk    |               394 |                       169 |          140,738 |                   78,797 |

Draw submissions fall approximately 32%, 44% and 57% respectively. A shadow
refresh frame costs more than a cached frame, so these averages must not be
treated as worst-frame timings. The room still exceeds the initial 200-call
mobile target when counting these passes.

The review ran Chromium through SwiftShader in WSL. Its software-rendering FPS
does not predict a phone GPU. No claim of 60 fps, or a physical-phone 30 fps floor,
is made from these measurements.

## Validation and remaining measurement

Unit coverage checks batching flags, independent animation/interaction meshes,
shadow cadence and quality adaptation. Browser journeys cover the live scene,
draw and cat interaction, board projection, camera gestures, pause, lamp/light
interactions, paper forms, context loss and reduced motion.

An instrumented production-browser check counted zero WebGL draw submissions
over 1.5 seconds after pausing, then confirmed new draws after resuming.

For the hardware acceptance gate, use the production build on a recent Android
Chrome and iPhone Safari. Record the exact device/browser, DPR after adaptation,
60-second frame-time median/p95, and dropped frames in outside, room and writing
views. Include camera travel and the cat draw. Check a warm device after several
minutes as well as the initial run. Profile before trading away more visual
detail: remaining costs include multiple local lights, transparent glow sprites,
and synchronous scene construction during initial loading.

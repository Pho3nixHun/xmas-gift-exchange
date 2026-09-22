# Recorded sound effects

The MP3 files in `audio-sources/` are the supplied originals. Playback uses the smaller, mono
44.1 kHz / 96 kbps derivatives in `apps/web/public/audio/`; keep the originals
for future edits. The derivatives total approximately 231 KB.

To regenerate them, install FFmpeg and run `node scripts/prepare-sounds.mjs`
from the repository root. The script trims before resetting timestamps and
applying fades, balances peak levels, and checks every encoded clip for silence
or excessive peaks. No audio tooling is needed to run the app.

| Source                | App clips                               | Interaction                                                                                                   |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `crunchy-bites.mp3`   | `crunch-01.mp3` through `crunch-11.mp3` | Two varied bites during each accepted cookie animation; no sound when the plate is empty                      |
| `cat-purr.mp3`        | `cat-purr.mp3`, 2.4 seconds             | Petting the cat; short attack and 300 ms fade, matching the pet animation                                     |
| `light-switch.mp3`    | `light-switch.mp3`, 0.575 seconds       | Every clickable light switch and the automatic desk lamp after sitting / on leaving                           |
| `magic-twinkle.mp3`   | `magic-twinkle.mp3`, 2.832 seconds      | Clicking the tree star                                                                                        |
| `santa.mp3`           | `santa.mp3`, 6.2 seconds                | Once per visible outdoor flyby; trailing silence removed                                                      |
| `wood-door-knock.mp3` | `wood-door-knock.mp3`, 1.1 seconds      | Near the doorstep, 85% through the camera approach; immediate with reduced motion or when already at the door |
| `glass-breaking.mp3`  | `glass-breaking.mp3`, 0.85 seconds      | Once when the cat reaches and breaks the selected ornament; replaces the early draw chime                     |
| `snowman-steps.mp3`   | `snowman-step.mp3`, 0.5 seconds         | One step in time with each footfall while the snowman is visible outdoors; quieter near the screen edge       |

Edits were made with FFmpeg, retaining small attack/tail margins around each
crunch and adding short fades to prevent cut clicks. Crunch sound intervals in
the source are 1.106–1.361, 2.324–2.497, 3.638–3.803, 4.925–5.177,
6.280–6.525, 7.548–7.771, 8.898–9.185, 10.375–10.579, 11.682–11.850,
13.073–13.263 and 14.478–14.679 seconds. Each exported bite includes 25 ms
before and 85 ms after that interval. The purr uses 2.32–4.72 seconds of its
source; the snow step uses 0.78–1.28 seconds. The glass break uses 0.25–1.10
seconds, removing silence before impact and after the shards settle. The door
knock uses 0.23–1.33 seconds, retaining the complete knocking sequence while
removing leading and trailing silence.

Sound is enabled by default. The first tap/click or keypress unlocks audio;
browser autoplay restrictions can prevent sound before that gesture. Clicking
the sound toggle to mute as the first gesture does not start playback. Effects
are downloaded and decoded once into a shared AudioContext after unlocking.
The data-access adapter owns HTTP; the scene runtime owns playback and timing.
Repeated effects replace their previous voice. Muting, hiding the tab or
teardown stops active and pending audio; re-enabling never replays old actions.
A download taking more than 350 ms skips that interaction's sound instead of
playing it late. Missing files fail silently and can retry on a later action.

Visitor audio runs on scene time, with no separate timers. It stops when the
scene is paused, reduced motion is enabled, visitors leave the viewport, or
the user approaches/enters the house. The bell chime remains synthesized. The ornament uses the recorded glass
break at impact, including with reduced motion. Unit coverage checks caching, mute races, playback bounds and
visitor timing; the physical-scene browser test checks actual decoded clip
playback for lights, cat, star, cookies and desk transitions.

## Background music at deployment

Add these settings to the JSON file selected by `APP_CONFIG_PATH` (Docker) or
`APP_CONFIG_FILE` (direct Node deployment):

```json
"audio": {
    "backgroundMusic": "/media/christmas.mp3",
    "musicVolume": 0.2
}
```

`backgroundMusic` defaults to `null` (no music). Use a public, same-origin path
ending in `.mp3`, `.m4a`, `.ogg` or `.wav`, not a server filesystem path. Encode
spaces in filenames as `%20`. `musicVolume` ranges from 0 to 1 and defaults to
0.2. Older configuration files without an `audio` entry still work.

With Compose, put the file at `media/christmas.mp3` beside the project, or set
`MEDIA_PATH=/absolute/path/to/your/music-folder` in `.env`. Compose mounts that
folder read-only at `/media/` in the app's public files. Its files are public;
keep only the intended audio there. Music is excluded from git and the Docker
build context. Restart the app after changing the JSON or adding a file:

```sh
docker compose up -d --force-recreate app
```

No image rebuild is needed to change music. With a direct Node deployment,
place the file in `dist/web/browser/media/` or serve `/media/` through your
reverse proxy. For Angular's development server, put a preview file in
`apps/web/public/media/`.

The browser streams and loops the track rather than decoding the entire song
into memory. The masthead sound toggle controls both music and effects. Hidden
tabs pause music; returning resumes its position when sound is enabled. A
missing file or rejected autoplay does not prevent using the house. No default
music recording is bundled; the deployment selects it.

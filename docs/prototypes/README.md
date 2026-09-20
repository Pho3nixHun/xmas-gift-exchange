# Winter House design reference

The chosen prototype is the [real-time 3D winter house](winter-house/).
Opening [index.html](index.html) redirects there. Product behavior and the
implementation plan live in the [documentation index](../README.md).

From the repository root:

```sh
npx http-server docs/prototypes -c-1
```

Open the printed server URL or append `/winter-house/`. The directory is
**prototypes**, plural. ES modules require HTTP; do not use `file://`.

See the [house notes](winter-house/README.md) for all interactions, recorded
walkthrough and browser-test limitations. The live experience is more current
than the recording. Use the menu to replay or try a 30-person sample.

## Retained fallback and artwork

[The illustrated village fallback](01-come-on-in.html) remains available when
WebGL cannot start. Its `app.js`, `app.css` and village/room/cat assets are
support files, not another proposed direction. It uses independent demo data;
switching between it and the 3D prototype does not share a session or draw.
The production simple view will instead use the same authenticated API and
stores as the 3D experience. [Artwork provenance](ARTWORK.md) is retained.

The alternative letter/baking pages, comparison page and earlier seven-direction
UX/UI studies were removed during implementation planning.

## Prototype limits

This is local sample data, not a real family exchange. Password comparison,
assignments and claims are browser-local and inspectable. There is no shared
backend, server authentication, feasible-draw guarantee, concurrent claim
protection, organiser setup, real preview fetching or installation support.
Do not import this storage into production. Example budgets require editorial
review. The 3D house keeps its vendored Three.js MIT license; fonts currently
load from Google Fonts with system fallbacks.

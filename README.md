# The little winter house

A family gift exchange inside a living snowy cottage. Angular 21, Angular Three,
Fastify and PostgreSQL. The implementation uses the approved prototype's scene,
with real accounts, concealed draws, live availability, wishes and private claims.

## Run locally

Use Node **24.18.0** and npm 11. Docker Desktop must expose its daemon to WSL.

```sh
nvm use
npm ci
cp .env.example .env
mkdir -p secrets
```

Choose the organiser password without putting it in shell history. In **zsh**:

```sh
read -r -s 'WINTER_PASSWORD?Organiser password (8–128 characters, three character types): '
printf '%s' "$WINTER_PASSWORD" | npm run hash:organiser --silent > secrets/organiser.hash
unset WINTER_PASSWORD
chmod 600 secrets/organiser.hash
```

In bash, use `read -r -s -p 'Organiser password: ' WINTER_PASSWORD` for the first
line. The hash command reads standard input and prints only the Argon2id hash.
Keep `secrets/` and `.env` out of Git.

For the complete Docker app:

```sh
PUBLIC_ORIGIN=http://localhost:8080 docker compose up -d --build
```

Open **http://localhost:8080**, then **http://localhost:8080/organiser**. Sign in
with your organiser password, enter the family, save exclusions, check the draw
and deliberately open the house. The doorstep then lets family members protect
and sign into their names. Starting containers never opens or resets a season.

For frontend/backend development:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up -d db
npm run db:migrate
npm run dev
```

Angular serves http://localhost:4200 and proxies the API. `docs/prototypes/winter-house`
remains the visual reference; the application is built from `apps/web`, not served
with `http-server`.

## What is connected

- Furnished doorway and identity selection, password protection and returning sessions.
- Fixed coloured ornaments, atomic constrained selection and live SSE invalidation.
  A cat fetches only a successfully committed choice. Interrupted requests reuse
  their original key; other tabs cannot create a second assignment.
- Names-only board, paper stacks at the board/mantel, seated notebook and lit desk
  lamp. Own wishes can be added, edited and removed until someone claims them.
- Private claims and release. Owners see edit locks, never the buyer or claim status.
- Organiser setup, directed exclusions, assisted single-use password recovery,
  separate organiser sessions and explicit full-season reset.
- HU/EN, remembered view/language preferences, three priority choices, optional
  sound/chewing, living fire/window/sky, reduced motion, pause and simple view.
- Native keyboard/swipe note paging, manual refresh, draft discard, browser-language
  selection and home-screen metadata/icons. No offline exchange writes.
- Optional bounded text link previews (`PREVIEWS_ENABLED=true`). Disabled by
  default until the host has an appropriate outbound firewall; saving always
  works without them. Remote images are deliberately not fetched.

## Checks

```sh
npm run build
npm run typecheck
npm run lint:ratchet
npm run format:check
npm run check:docs
npm test
TEST_DATABASE_URL=postgresql://... npm run test:integration
```

Integration tests create and drop a uniquely named disposable database. Their
PostgreSQL role needs `CREATEDB`. Browser tests use a separate disposable season
and require `E2E_ALLOW_RESET=true` outside CI. `e2e/server.mjs` supplies a test-only
organiser password; never use it to start a real deployment. The test suite checks
real WebGL loss, animation pause, saved wishes, claims, recovery and lost draw
responses. CI starts the built app, not the development server.

The generated HTTP schema is available at `/api/v1/openapi.json`. See the
[product specification](docs/spec.md), [implementation status](docs/engineering/implementation-status.md)
and [operator runbook](docs/engineering/operator-runbook.md) for deployment,
configuration, backups and remaining physical-device/HTTPS rehearsal gates.

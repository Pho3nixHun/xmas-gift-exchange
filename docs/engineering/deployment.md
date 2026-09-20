# Own-server deployment and configuration

Confirmed direction (D-22): source is published to GitHub, the owner clones it
on their own server and runs a Docker stack. This is a deployment specification;
no push, clone on the server, image publication or deployment occurs in the docs
phase. Docker Compose is the proposed packaging for this single-server topology.
If the operator uses Swarm's `docker stack deploy`, provide its explicit image/
secret/health configuration before deployment rather than assume Compose build
steps run in Swarm.

## 1. Deliverables and topology

Implementation supplies a multi-stage Dockerfile, `compose.yaml`, example
non-secret environment file, typed application-config schema/example, secret-file
instructions, migrations, hash-generation command and an operator runbook.
Ignore actual `.env`, secrets, backup files and local configuration containing
personal details in Git. The example values must be safe to publish.

One app container serves built Angular assets, runtime public configuration,
REST and SSE. One PostgreSQL container has a persistent named volume and private
network; expose no database port to the public internet by default. A one-shot
migration service uses the same versioned application image. Use the server's
existing reverse proxy or an optional packaged proxy; domain, bind address, host
port, networks and TLS attachment are configurable.

Keep the API at the same public origin as the frontend. Use relative API paths
so the same build works under different hostnames without rebuilding Angular.
Configure HTTPS/HTTP2, forwarded-header trust and SSE flushing/timeouts explicitly.
Support clean installation on the server's architecture through a local source
build; record supported amd64/arm64 image builds when packaging is implemented.

## 2. Configuration contract

All operational and editorial settings are configuration, not source edits.
Parse/validate once at startup and fail with a useful, redacted error for invalid
or conflicting values. Publish a generated settings reference with name, type,
default, allowed range, secrecy, restart behavior and upgrade compatibility.
Environment overrides application-config-file values, which override versioned
defaults. A secret variable and its `_FILE` variant cannot both be set.
Missing production secrets fail startup; no built-in production credentials.

| Area                   | Required configurable settings                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Identity of deployment | Public HTTPS origin, app/season display label, default locale, enabled locales, organiser contact text/link                              |
| Containers/network     | App bind/port, host bind/port, proxy/network integration, persistent volume names/paths, resource limits, restart policy                 |
| Database               | Host/port/database/user, password or connection-string secret, TLS mode, pool size, connect/query/lock timeouts                          |
| Authentication         | Organiser hash secret, session lifetimes, password length bounds, Argon2 work factors, trusted proxy list, auth rate limits              |
| Recovery               | Token lifetime, recent-organiser-auth window, issuance/redemption limits, participant-facing contact instructions                        |
| Realtime               | Heartbeat, reconciliation/poll intervals, reconnect bounds, ready/watchdog/idle timeouts, connection/buffer limits                       |
| API/content limits     | Roster cap within tested range, wish/URL/name length caps, page sizes, request-byte caps and write rate limits                           |
| Link previews          | Enabled flag, timeout/redirect/HTML/image limits, concurrency/cache TTLs, allowed outbound ports/egress policy                           |
| Editorial              | HU/EN guideline files, budgets as locale text, loading facts/source links, brand/season strings                                          |
| Rendering/preferences  | DPR caps, quality/particle budgets, ambient timing, initial motion/audio preferences; reduced-motion and user mute still take precedence |
| Operations             | Log level/retention/redaction policy, health ports, maintenance mode, backup schedule/destination/retention, encryption secret           |

Defaults come from the architecture/security/realtime specs. Configuration cannot
silently weaken product invariants: no self/excluded draw, one giver/recipient,
claimed-wish lock, authentication/authorisation, token single-use and private
buyer identity remain enforced. Validate policy values against supported safe
ranges; raising the roster beyond the tested 30 or enabling multiple replicas
requires the corresponding compatibility/load test and fan-out adapter.

Public settings come from `GET /api/v1/public-config`, serialized through a
strict allowlist: brand/season text, locales, guideline copy, contact instructions,
public form limits, rendering defaults. Never serialize the environment or full
server settings object. Database credentials, hashes, token material, internal
addresses and operational details remain server-only. Load public config before
forms/content, with a readable retry state if unavailable. Validate locale keys
and guideline schema at startup. In v1, changes require a controlled restart;
no new admin configuration editor is required.

Use mounted read-only secret files or Docker secrets with `_FILE` support for
the database password, organiser hash and backup key. Source and compiled assets
must contain no real secret. Docker documents [Compose secret mounts](https://docs.docker.com/compose/how-tos/use-secrets/)
and [configuration interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/).
Keep the deployment reference compatible with the chosen Docker version.

## 3. Planned operator workflow

The implementation runbook must support this sequence from a clean server:

1. Clone the GitHub repository and check out a reviewed release tag/commit.
   Deploy an identifiable version, not an unnoticed moving branch.
2. Copy the environment/config examples outside tracked source as appropriate;
   set public origin, proxy/ports, organiser contact, database credentials and
   secrets. Generate the organiser hash with the provided command without
   printing a plaintext password to logs or shell history.
3. Validate the effective configuration (with secrets redacted), build the
   application image using the checked-in lockfile, and start PostgreSQL.
4. Wait for database readiness, take a backup if upgrading, and run the explicit
   migration service. Do not let every app start race to apply migrations.
5. Start/recreate the app and proxy, then verify health/readiness, HTTPS/cookies,
   public content and SSE delivery through the actual public origin.
6. Sign in as organiser and configure/open the family season deliberately.
   Starting/restarting containers never resets or opens a season automatically.

Document concrete commands and expected output alongside the delivered files.
The command names above are workflow descriptions, not runnable deployment
instructions before the implementation exists.

## 4. Updates, backup and rollback

For updates: enable maintenance where needed, back up, fetch/check out the next
release, build, migrate and recreate the app. Keep database/preview storage
persistent across image replacement. No `down -v`, implicit seed reset or old
browser-state import in routine operations. Drain/reconnect SSE clients and
verify a remembered session, draw recovery and locked wish after upgrade.

Default proposal remains daily encrypted backups, seven-day retention, RPO
24 hours and RTO four hours. Configure the actual destination, schedule and
retention; include database plus separately stored preview assets if any.
Protect file permissions/encryption keys and rehearse restoration. Report reset
semantics honestly: passwords/content disappear live immediately, while backup
copies expire under the configured retention policy.

Prefer compatible forward migrations. Rolling an image back is allowed only
if its database schema remains compatible. A database restore runs in maintenance,
revokes sessions and must not silently lose acknowledged assignments or claims;
review whether to recover latest data or explicitly reset the season. Organiser
credential rotation is configuration plus session revocation, not a data reset.

## 5. Deployment acceptance

From a fresh GitHub checkout and empty volumes, the documented workflow works
without private package registries or local reference-project files. Domain,
ports, public copy, recovery expiry and quality settings change via configuration
without code edits. Public config contains no secret. Invalid settings fail
before serving traffic. Persistent data survives container replacement. Backup/
restore, credential rotation and migration failure handling are rehearsed.
Verify real proxy SSE latency with 30 viewers and physical high-end Android/
iPhone clients, along with session cookies, link recovery and graceful offline
handling. No external hosted provider is a prerequisite.

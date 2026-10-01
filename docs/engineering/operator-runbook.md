# Operator runbook

This application runs as **one API process** plus PostgreSQL. Use a reviewed
commit on your own server. Do not publish secrets or use the browser-test server.

## Install and configure

1. Clone the repository, install Node 24 and run `npm ci`. Follow the root
   [README](../../README.md) to generate `secrets/organiser.hash` from a password.
2. Copy `.env.example` to `.env`. Set strong independent database credentials
   consistently in `POSTGRES_PASSWORD`, `DATABASE_URL` and `DOCKER_DATABASE_URL`.
   The Docker URL must use the database service hostname `db`.
3. Set `PUBLIC_ORIGIN=https://your-hostname`, `ALLOW_HTTP_COOKIES=false`, host
   bind/port and the organiser secret path. Keep the database private.
4. Copy `config/app.example.json` to an ignored `config/local.app.json`; set
   `APP_CONFIG_PATH=./config/local.app.json`. Set the real organiser contact,
   labels, default language and rendering DPR. The historical guideline files
   preserve the agreed HU/EN budgets without currency conversion.
5. Configure your existing TLS proxy using
   [the nginx example](../../config/nginx.example.conf). Enable HTTP/2 at the
   public listener. Set `TRUST_PROXY` to the actual proxy IP/CIDR, never an
   unrestricted forwarded-header trust. The SSE location must flush without
   buffering and keep an idle timeout above 15 seconds.
6. Run `docker compose config --quiet`, then `docker compose up -d --build`.
   Compose waits for PostgreSQL, applies the reviewed migrations once, then
   starts the application. Check `/api/v1/health` and `/api/v1/ready`.
7. Open `/organiser`, save the family and exclusions, validate, then open the
   season deliberately. A server restart does not alter the draw.

The production server requires an organiser hash and database URL. Changing the
organiser hash invalidates old organiser sessions without resetting the family.
For a forgotten organiser password, regenerate the hash file and recreate the
app. Participant recovery is issued in the organiser page after password
confirmation; send that link privately after verifying the person yourself.

## Runtime configuration

For optional looping music, see [background music settings](audio-assets.md#background-music-at-deployment).

All values below are read at startup. Restart after changes. Environment values
control operational policy; the mounted JSON and guideline files control public
copy. Public API responses never include secrets or server addresses.

| Variable                                 | Default / supported values                  | Purpose                                                                                                                     |
| ---------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_ORIGIN`                          | Exact HTTP(S) origin                        | Cookies, CSRF origin and recovery links; HTTPS in production                                                                |
| `HOST`, `PORT`                           | `127.0.0.1`, `3000`; Docker binds `0.0.0.0` | API listener                                                                                                                |
| `HOST_BIND`, `HOST_PORT`                 | `127.0.0.1`, `8080`                         | Compose publication                                                                                                         |
| `DATABASE_URL` / `DATABASE_URL_FILE`     | Required in production; mutually exclusive  | PostgreSQL connection; TLS parameters may be included                                                                       |
| `DOCKER_DATABASE_URL`                    | Required in Compose                         | Connection using the private `db` service                                                                                   |
| `ORGANISER_HASH` / `ORGANISER_HASH_FILE` | Required in production; mutually exclusive  | Argon2id hash, never plaintext                                                                                              |
| `ORGANISER_HASH_PATH`                    | `./secrets/organiser.hash`                  | Compose secret source                                                                                                       |
| `APP_CONFIG_FILE`                        | `config/app.example.json`                   | Local public editorial JSON                                                                                                 |
| `APP_CONFIG_PATH`                        | `./config/app.example.json`                 | Host file mounted by Compose                                                                                                |
| `MEDIA_PATH`                             | `./media`                                   | Public audio folder mounted read-only at `/media/`; set `audio.backgroundMusic` and `audio.musicVolume` in the runtime JSON |
| `GUIDELINES_DIRECTORY`                   | `docs/content`                              | HU/EN guideline JSON directory                                                                                              |
| `ALLOW_HTTP_COOKIES`                     | `false`                                     | Explicit local Docker HTTP exception; never needed with TLS                                                                 |
| `TRUST_PROXY`                            | Empty; comma-separated IP/CIDR list         | Trust only the actual ingress                                                                                               |
| `PARTICIPANT_SESSION_DAYS`               | `120`; 1–180                                | Participant cookie/session lifetime                                                                                         |
| `ORGANISER_SESSION_HOURS`                | `8`; 1–24                                   | Separate organiser session lifetime                                                                                         |
| `RECOVERY_MINUTES`                       | `30`; 5–60                                  | Single-use participant recovery expiry                                                                                      |
| `REAUTH_MINUTES`                         | `5`; 1–15                                   | Recent organiser password confirmation                                                                                      |
| `DB_POOL_SIZE`                           | `10`; 2–30                                  | Shared database connections                                                                                                 |
| `DB_QUERY_TIMEOUT_MS`                    | `5000`; 1000–30000                          | Statement and lock timeout                                                                                                  |
| `REQUEST_BODY_BYTES`                     | `131072`; 131072–262144                     | Supports the complete 30-person exclusions matrix                                                                           |
| `PREVIEWS_ENABLED`                       | `false`                                     | Optional title/site previews; enable only with restricted outbound networking                                               |
| `MAINTENANCE`                            | `false`                                     | Serve 503, preserving health/readiness endpoints                                                                            |
| `LOG_LEVEL`                              | `info`; a pino level or `silent`            | JSON log lines on stdout; `debug` adds successful health/readiness probes                                                   |
| `WORKBENCH_ENABLED`                      | `false`                                     | Legacy validation-only developer endpoint; unnecessary for the real app                                                     |

Safety limits are intentionally fixed within the tested v1 envelope: 30 people,
500 Unicode code points per wish, 10–128-character passwords, Argon2id 64 MiB /
3 iterations / parallelism 1, two concurrent hash workers with 30 bounded queued
jobs, 20 wishes per API page, seven ornaments/eight board cards per visual page.
Authentication failures are limited per identity and per IP; successful family
logins do not consume the shared-IP failure allowance. Rates are single-process
memory state; run one replica. Expired sessions fail closed in PostgreSQL.

SSE uses a 15-second heartbeat, two-second reconciliation and bounded buffers.
The client polls when streaming is unavailable and resynchronises after hidden
or disconnected tabs. Neither transport reserves a name; the locked draw
transaction decides. Adding replicas requires shared invalidation/rate-limit
adapters and a new load test.

Previews use pinned public DNS addresses, revalidate up to two redirects, accept
only bounded HTML without compressed payloads, and return plain title/site text.
Two jobs run at once, with at most 16 queued/in-flight URLs and a five-second
fetch deadline. Cache lifetime is one day on success, ten minutes on failure;
reset clears it. Remote images are not fetched. Restrict egress to public HTTP(S)
and explicitly deny internal/metadata networks at the host firewall as a second
boundary. Leave previews disabled if that boundary is unavailable.

## Backup and restore

Set a private backup destination, daily schedule and seven-day retention. Keep
an offline encryption passphrase file readable only by the backup operator.
Example (bash, `set -o pipefail`, paths are operator-controlled):

```sh
umask 077
mkdir -p backups
set -o pipefail
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' \
  | gpg --batch --yes --pinentry-mode loopback \
      --passphrase-file /secure/winter-backup-passphrase \
      --symmetric --cipher-algo AES256 --output backups/winter.dump.gpg
```

Use unique dated filenames in the scheduler. Keep keys separately from encrypted
backups. Retention applies to old passwords/content in backups even after an
application reset; live reset does not erase historical backup files.

Rehearse into a **new empty database**, never over the running season:

```sh
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" winter_restore'
gpg --batch --pinentry-mode loopback \
  --passphrase-file /secure/winter-backup-passphrase \
  --decrypt backups/winter.dump.gpg > /secure/verified-winter.dump
# Continue only if decryption/integrity verification exits successfully.
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d winter_restore --exit-on-error' \
  < /secure/verified-winter.dump
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d winter_restore -v ON_ERROR_STOP=1 -c "DELETE FROM session;"'
rm /secure/verified-winter.dump
```

Use a separate app instance pointing at the restored database to verify roster,
assignments, wish locks and recovery. Only cut over during declared maintenance
with an explicit decision about writes acknowledged after the backup. Target
RPO is 24 hours and RTO four hours; measure these with the real server/destination.

## Upgrade and launch checks

Back up, check out the reviewed revision, rebuild and run Compose. Do not use
`docker compose down -v` for updates. A failed migration prevents app startup;
inspect and fix it before retrying. Roll back an image only when its database
schema remains compatible. Keep secrets/configuration and the database volume
outside image replacement. Error responses contain safe codes/request IDs;
request bodies, passwords, recovery tokens and assignments are not logged.

The app writes one JSON line per response to stdout (`docker compose logs app`):
`reqId`, method, route template, status and `durationMs`. A 5xx is logged at
error level, and its `reqId` matches the `requestId` in the error response. An
unexpected error adds an `unhandled error` line with the error type, its code
(for example a PostgreSQL SQLSTATE) and the stack frames. The message reads
`[redacted]`, because error messages can quote query parameters or input.
URLs, query strings, headers, cookies, CSRF tokens and bodies are never logged.

Before sharing the real family link, check secure cookies and SSE through the
actual HTTPS proxy, complete a disposable constrained draw with concurrent
phones, test forgotten-password recovery, and rehearse reset. Check current
high-end Android/iPhone browsers, native keyboard resizing, VoiceOver/TalkBack,
text zoom, motion/sound preferences and sustained GPU/battery behaviour. These
physical-device and own-server gates cannot be certified by desktop Chromium
software rendering. Do not import prototype local-storage state.

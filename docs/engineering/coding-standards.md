# Coding, linting and formatting standards

This is the adoption contract for implementation. P0 now supplies the workspace
configuration; see [implementation status](implementation-status.md) for scope.

## 1. Provenance and portability

These standards were adapted on 20 September 2026 from a private Angular and
Three.js reference project, called "the reference" below. The source was its
written coding standards and its ESLint, Prettier, EditorConfig, TypeScript,
Angular workspace and lint-ratchet configuration, including the settings of
the shared lint and format packages it installs. The reference is not public,
and this repository does not depend on it.

Adopt the rules and rationale below through public tooling and local
configuration. The reference depends on private packages. Do not add those
packages, registry configuration, business code, theme, assets, local agent
hooks or names from the reference to this application. Reproduce the
applicable rule settings explicitly; a clone of this repository must not need
access to the reference. Keep explanatory comments beside exceptions.

P0 must compare effective ESLint rules on a representative frontend, template,
scene, contract, backend and tooling file against this document. Verify that
flat-config ordering does not silently replace restrictions. Type information
stays enabled for source, `app.config.ts` and project-owned tests.

## 2. Formatting — exact adopted values

Use a local `prettier.config.mjs` with these settings:

```js
export default {
    arrowParens: 'avoid',
    bracketSpacing: true,
    bracketSameLine: false,
    endOfLine: 'lf',
    htmlWhitespaceSensitivity: 'css',
    insertPragma: false,
    printWidth: 80,
    useTabs: false,
    trailingComma: 'es5',
    tabWidth: 4,
    semi: true,
    singleQuote: true,
    quoteProps: 'as-needed',
    embeddedLanguageFormatting: 'auto',
};
```

`.editorconfig`: root true, UTF-8, spaces, indent four, final newline, trim
trailing whitespace; TypeScript single quotes (including the JetBrains hint).
Markdown has no hard editor line limit and preserves meaningful trailing spaces.
Prettier's 80 columns are a formatting preference, not a prose truncation rule.

Ignore generated build output, `.angular`, dependencies, coverage, generated
API output and the lockfile. Preserve the research prototype and its vendored
Three.js without mass reformatting; production source is never ignored to
make lint pass. Format all authored TypeScript, HTML, SCSS, scripts, JSON and
Markdown. `eslint-config-prettier` goes last; formatting is a separate check.

## 3. Strict TypeScript and import hygiene

Adopt `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
`noPropertyAccessFromIndexSignature`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, `isolatedModules`, `skipLibCheck` and
`importHelpers`. Angular additionally enables strict templates, strict input
access, strict injection parameters and disables legacy i18n message IDs.

Browser target starts at ES2022 with DOM/DOM.Iterable, module preserve and
Angular-supported TypeScript 5.9. Backend uses its own NodeNext module/resolution
and Node-only globals/libs; no browser globals in API code. The reference's
ESNext types do not polyfill `Map.groupBy`, iterator helpers or copying array
methods: use only verified browser-supported APIs or explicit tested polyfills.

Use the public `typescript-eslint` strict-type-checked and stylistic-type-checked
sets. Keep no-floating-promises, no-misused-promises, unnecessary-condition
checks, nullish coalescing, optional chaining, consistent type-only imports
and readonly fields. No non-null assertions. Indexed reads require a guard
or an honest fallback; do not silence missing values with a cast.

The reference allows `as` assertions for Three.js interop but forbids object
literal assertions (`objectLiteralTypeAssertions: never`). Prefer `satisfies`
and narrowing. Allow numbers in template expressions; exhaustive union switches
may use a default branch. Member names use camelCase without leading/trailing
underscores. String-literal unions replace enums.

Import ordering: builtin, external, internal, parent, sibling, index, object;
alphabetise case-insensitively within groups, blank lines between groups.
Resolve TypeScript workspace aliases; report unresolved and undeclared package
imports. Runtime code must not import dev-only dependencies. Do not globally
suppress checks on test files; they belong to a test tsconfig.

## 4. Modern Angular

Standalone only; no NgModules. `OnPush` everywhere, `inject()` rather than
constructor injection, `providedIn` on injectables, host metadata rather than
HostBinding/HostListener decorators. Selectors use `wh-` kebab-case elements
and `wh` camelCase attribute directives.

Use `input()`, `output()`, `model()`, signal queries, `computed()` and
`linkedSignal()` for derivation/defaults. No decorator inputs/outputs/queries
or EventEmitter. Templates use built-in `@if`, `@for` with stable `track`,
`@empty`, `@switch` and appropriate `@defer`; prohibit the old structural
control-flow directives. Enable the reference's preferred else/empty,
self-closing/static-string/template-literal and contextual-variable rules.
Run angular-eslint accessibility rules on inline and external templates.

`ui/` is input/output-only and injects nothing, knows no store and imports
neither Three.js nor Angular Three. Containers inject stores, translate data
into presentation and compose controls. Rules about exchange data belong in
domain stores/use cases, not component click handlers.

Every application store is NgRx SignalStore. Reads use `resource()` or
`httpResource()` keyed by signals, not manual loaders called by effects.
Explicit mutation commands are a documented extension to the read-oriented
reference: isolate async transport in data-access adapters and expose typed
pending/result/error state. Never use a GET resource to execute a mutation.
Keep abort/retry and stale-response behavior visible at that boundary.
Scene audio may inject a data-access adapter to load static sound assets;
playback, decoding and caching remain in the scene runtime.
The realtime adapter owns exactly one stream per active draw view, teardown
and fallback polling. Event handlers invalidate resource reads; they never
write scene objects or initiate draw mutations.

`effect()` is a last resort in UI/container code. Prefer derivation; use
`afterRenderEffect()` for necessary DOM interop. Scene runtime may mirror
signals into mutable Three.js objects; the persistence adapter may mirror
non-secret preferences into storage. Each other exception needs a narrow
lint disable explaining why derivation cannot work. No effect may trigger a
draw, claim, payment-like action or password operation.

Keep the reference's Signal Forms convention (`@angular/forms/signals`), with
no FormsModule/ReactiveFormsModule in the baseline. Its Angular 21 experimental
status requires the P0 compatibility/form spike and isolated components.
Use native HTML controls first. If a composite accessible widget is needed,
evaluate Angular Aria at a compatible exact version; do not invent keyboard
semantics. The reference's own template control names are not copied.

## 5. Functional style and controlled mutation

Classes are for decorated Angular DI types and Error subclasses. Backend
rules/use cases/adapters are functions and records, not new class hierarchies.
Use immutable domain data and readonly type signatures. Local Map/Set indexes
are allowed. Scene render/appearance/world/runtime code may mutate typed arrays,
canvas contexts and Three.js objects; request/response data remains immutable.
Tests may construct mutable fixtures. Don't spread expensive GPU objects just
to appear immutable.

Prefer const, expressions, map/filter/reduce and early returns. Prohibit loops
outside tests, including tooling and scene files, as the reference does.
A measured hot-path buffer fill may use a narrowly documented exception with
benchmark evidence; “it is 3D” is not a blanket waiver. Prefer existing pure
helpers over unreadable nested reductions. No enums, labels, for-in, var,
parameter rebinding or non-null assertions. Throw only to reject promises at
an adapter boundary; domain failures are discriminated results.

Adopt these reference limits:

| Rule                                    | Setting                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| `functional/no-let`                     | Warning, zero baseline; allow loop initialiser only under justified loop exception |
| `functional/no-loop-statements`         | Error outside specs                                                                |
| `functional/readonly-type`              | Error, keyword style                                                               |
| `functional/no-mixed-types`             | Error                                                                              |
| `functional/prefer-property-signatures` | Error                                                                              |
| `functional/immutable-data`             | Error outside explicit mutable adapters/scene/spec exemptions                      |
| `max-depth`                             | 4                                                                                  |
| `max-params`                            | 5                                                                                  |
| `complexity`                            | 12                                                                                 |
| `eqeqeq`                                | Always, null comparison exception                                                  |
| `no-param-reassign`                     | Error, `props: false`; immutable-data covers domain property writes                |
| `arrow-body-style`                      | As needed                                                                          |
| `no-else-return`                        | Error, including else-if                                                           |
| `no-console`                            | Error in shipped code except warn/error; backend uses redacted structured logger   |

Keep explicit allowed exceptions, not a global disable for an entire backend.
Fastify registration, database driver and crypto interfaces are I/O adapters;
use scoped interop exemptions where those APIs require mutation.

## 6. Enforced boundaries

Default-deny dependencies with eslint-plugin-boundaries plus restricted imports
and globals. Use the [architecture layout](architecture.md#2-workspace-and-dependency-directions).

| Layer                   | Permitted internal dependencies                                         |
| ----------------------- | ----------------------------------------------------------------------- |
| Shared contracts        | None from either application                                            |
| Web core                | Pure shared values only, no Angular/Three/HTTP                          |
| Web data access         | Contracts and core                                                      |
| Web domain stores       | Contracts, core, data access                                            |
| Web view stores         | Core and guarded preference persistence                                 |
| Web render              | Core and geometry types, no Angular/store/HTTP                          |
| Web appearance          | Core and render types, no Angular/store/HTTP                            |
| Web scene world/runtime | Core, render, appearance, view state and supplied scene view models     |
| Web UI                  | Core/pure display types only; Angular input/output/form primitives      |
| Web containers          | Domain/view stores, UI, scene components, localisation adapter, core    |
| API domain              | Pure domain values; no Fastify/Drizzle/network                          |
| API application         | Domain, contracts and port definitions                                  |
| API adapters            | Application ports, domain, necessary platform/database/network packages |
| API HTTP                | Contracts, application use cases; dependencies supplied by bootstrap    |

Containers convert exchange state into a minimal scene view model; scene
components have no direct domain-store dependency. This tightens the reference's
map-container exception so a cat/ornament renderer never owns exchange rules.

Ban raw fetch/HttpClient/EventSource outside web data access; ban localStorage/sessionStorage
outside persistence adapters. A separate session-storage adapter is allowed
only for non-secret pending mutation IDs used in recovery, not assignments,
passwords or wish content. Import direction applies to barrels and type imports,
not just direct runtime imports. Keep i18n injection in containers/adapters;
UI controls receive already-localised strings.

## 7. Lint composition and security

Use public ESLint, typescript-eslint, angular-eslint, import-x, boundaries,
functional, security and Vitest plugins. Start from the same strict base
behavior; omit Lit/web-component rules and the reference's private packages.
Keep security rules for unsafe regex, child processes, eval, unsafe Buffer use,
timing comparisons, nonliteral require and insecure randomness. The reference
turns object-injection detection off because it flags typed indexing; adopt
that choice, retaining runtime validation on untrusted objects. Nonliteral
filename/regex warnings start at zero; exempt only justified trusted tooling.

Scope browser and Node globals separately. Tooling outside a tsconfig uses
non-type-aware rules, but still gets const/loop/let, equality, arrow, depth and
parameter rules. Source config files and tests keep type-aware lint. Unused
eslint-disable directives are failures. An exception includes its reason and
smallest necessary scope.

The ratchet fails on any error or an increased warning count. This new codebase
starts with zero warnings, including no-let, rather than inheriting the four
remaining reference warnings. Do not update the baseline to bless a regression.
Migrate zero-count warning rules to errors when practical. CI must enforce the
checks itself; local agent hooks are not a release guarantee.

## 8. Tests and planned commands

Vitest 4 through the Angular builder for web and plain Vitest for server/domain.
Specs live beside code, import from `vitest`, and use `it`. Focused tests are
errors; disabled tests are warnings subject to the zero ratchet. Pure geometry,
matching and projection get plain tests; stores use TestBed/fake adapters;
presentational components assert inputs, rendered behavior and emitted actions.
Real PostgreSQL tests use independent connections for races. Playwright checks
user-visible flows and accessibility, not private implementation trivia.

P0 supplies these workspace commands:

| Command                         | Contract                                                     |
| ------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                   | Web + API with local proxy, documented database prerequisite |
| `npm run build`                 | Contracts, API, production web; no implicit database reset   |
| `npm run typecheck`             | Every app, contracts and tests                               |
| `npm run lint` / `lint:fix`     | Whole authored workspace / explicit fixes                    |
| `npm run lint:ratchet`          | Fail errors and warning regressions                          |
| `npm run format` / `format:fix` | Check / write authored supported files                       |
| `npm run check:docs`            | Local links, referenced requirement IDs and required docs    |
| `npm test`                      | Unit/component tests                                         |
| `npm run test:integration`      | Disposable real PostgreSQL tests                             |
| `npm run test:e2e`              | Built frontend/API user journeys                             |
| `npm run db:migrate`            | Explicit reviewed migrations; never edit generated history   |

Do not manually edit lockfiles or generated artifacts. Use package/build tools.
Keep these commands and actual configuration in sync during implementation.

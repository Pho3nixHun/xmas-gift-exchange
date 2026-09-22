import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import angular from 'angular-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import functional from 'eslint-plugin-functional';
import importX from 'eslint-plugin-import-x';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tsFiles = [
    'apps/**/*.ts',
    'packages/**/*.ts',
    'e2e/**/*.ts',
    '*.config.ts',
];
const syntax = [
    {
        selector:
            "ClassDeclaration:not([decorators.length>0]):not([superClass.name='Error'])",
        message: 'Use functions over data; classes are for Angular DI.',
    },
    {
        selector: "Decorator[expression.callee.name='NgModule']",
        message: 'Standalone components only.',
    },
    { selector: 'TSEnumDeclaration', message: 'Use a string-literal union.' },
    { selector: 'ForInStatement', message: 'Use Object.entries().' },
    { selector: 'LabeledStatement', message: 'No labels.' },
];
const restrictedEffect = {
    selector: "CallExpression[callee.name='effect']",
    message:
        'Prefer computed/linkedSignal, resource or afterRenderEffect. Explain interop exceptions.',
};
const coreRules = {
    'prefer-const': 'error',
    'no-var': 'error',
    'no-param-reassign': ['error', { props: false }],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'prefer-arrow-callback': 'error',
    'arrow-body-style': ['error', 'as-needed'],
    'no-else-return': ['error', { allowElseIf: false }],
    'max-depth': ['error', 4],
    'max-params': ['error', 5],
    complexity: ['error', 12],
    'functional/no-let': ['warn', { allowInForLoopInit: true }],
    'functional/no-loop-statements': 'error',
};
const layers = [
    ['contracts', 'packages/contracts/src'],
    ['web-core', 'apps/web/src/app/core'],
    ['web-data', 'apps/web/src/app/data-access'],
    ['web-domain', 'apps/web/src/app/state/domain'],
    ['web-view', 'apps/web/src/app/state/view'],
    ['web-render', 'apps/web/src/app/scene/render'],
    ['web-appearance', 'apps/web/src/app/scene/appearance'],
    ['web-world', 'apps/web/src/app/scene/world'],
    ['web-runtime', 'apps/web/src/app/scene/runtime'],
    ['web-ui', 'apps/web/src/app/ui'],
    ['web-containers', 'apps/web/src/app/containers'],
    ['web-i18n', 'apps/web/src/app/i18n'],
    ['web-entry', 'apps/web/src/main.ts'],
    ['api-errors', 'apps/api/src/errors.ts'],
    ['api-domain', 'apps/api/src/domain'],
    ['api-application', 'apps/api/src/application'],
    ['api-adapters', 'apps/api/src/adapters'],
    ['api-http', 'apps/api/src/http'],
    ['api-config', 'apps/api/src/config.ts'],
    ['api-bootstrap', 'apps/api/src/bootstrap.ts'],
    ['api-entry', 'apps/api/src/main.ts'],
];
const dependencies = {
    contracts: [],
    'web-core': [],
    'web-data': ['contracts', 'web-core'],
    'web-domain': ['contracts', 'web-core', 'web-data'],
    'web-view': ['web-core'],
    'web-render': ['web-core'],
    'web-appearance': ['web-core', 'web-render'],
    'web-world': [
        'web-core',
        'web-render',
        'web-appearance',
        'web-runtime',
        'web-view',
    ],
    'web-runtime': [
        'web-core',
        'web-data',
        'web-render',
        'web-appearance',
        'web-world',
        'web-view',
    ],
    'web-ui': ['web-core'],
    'web-i18n': ['web-core'],
    'web-containers': [
        'contracts',
        'web-core',
        'web-domain',
        'web-view',
        'web-ui',
        'web-runtime',
        'web-i18n',
    ],
    'web-entry': ['web-containers'],
    'api-errors': [],
    'api-domain': [],
    // Infrastructure only: the Drizzle schema, the pool and the migration
    // runner, password hashing and the outbound preview fetch.
    'api-adapters': ['api-domain', 'api-config', 'api-errors'],
    // Transaction-scoped use cases. They own transaction boundaries and keep
    // their locking visible, so they speak to the database directly rather
    // than through repository ports. See docs/engineering/architecture.md.
    'api-application': [
        'contracts',
        'api-domain',
        'api-adapters',
        'api-config',
        'api-errors',
    ],
    'api-http': ['contracts', 'api-application', 'api-config', 'api-errors'],
    'api-config': ['contracts'],
    'api-bootstrap': [
        'api-config',
        'api-http',
        'api-application',
        'api-adapters',
    ],
    'api-entry': ['api-bootstrap'],
};

export default defineConfig([
    globalIgnores([
        'node_modules/**',
        '**/dist/**',
        'dist/**',
        '.angular/**',
        'docs/prototypes/**',
        'apps/api/drizzle/**',
        'coverage/**',
        'test-results/**',
        'playwright-report/**',
    ]),
    {
        files: ['**/*.mjs'],
        extends: [js.configs.recommended],
        languageOptions: { globals: globals.node },
        plugins: { functional },
        rules: coreRules,
    },
    {
        files: tsFiles,
        extends: [
            js.configs.recommended,
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: './tsconfig.spec.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: { functional, security, 'import-x': importX },
        settings: {
            'import/resolver': {
                typescript: { project: './tsconfig.spec.json' },
            },
            'import-x/resolver': {
                typescript: { project: './tsconfig.spec.json' },
            },
        },
        linterOptions: { reportUnusedDisableDirectives: 'error' },
        rules: {
            ...coreRules,
            'no-restricted-syntax': ['error', ...syntax],
            'no-console': ['error', { allow: ['warn', 'error'] }],
            'functional/readonly-type': ['error', 'keyword'],
            'functional/prefer-property-signatures': 'error',
            'functional/no-mixed-types': 'error',
            'functional/no-throw-statements': [
                'error',
                { allowToRejectPromises: true },
            ],
            'functional/no-class-inheritance': [
                'error',
                { ignoreCodePattern: ['extends Error'] },
            ],
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-extraneous-class': [
                'error',
                { allowWithDecorator: true },
            ],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', disallowTypeAnnotations: false },
            ],
            '@typescript-eslint/consistent-type-assertions': [
                'error',
                { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
            ],
            '@typescript-eslint/restrict-template-expressions': [
                'error',
                { allowNumber: true },
            ],
            '@typescript-eslint/no-confusing-void-expression': [
                'error',
                { ignoreArrowShorthand: true },
            ],
            '@typescript-eslint/switch-exhaustiveness-check': [
                'error',
                { considerDefaultExhaustiveForUnions: true },
            ],
            '@typescript-eslint/prefer-readonly': 'error',
            'import-x/no-unresolved': 'error',
            // The layer policy allows world and runtime to reach each other, so
            // only this rule stands between that pair and a real import cycle.
            'import-x/no-cycle': ['error', { maxDepth: Infinity }],
            'import-x/no-extraneous-dependencies': [
                'error',
                {
                    packageDir: [
                        '.',
                        'apps/api',
                        'apps/web',
                        'packages/contracts',
                    ],
                    devDependencies: [
                        '**/*.spec.ts',
                        '**/*.config.ts',
                        'e2e/**',
                    ],
                },
            ],
            'import-x/order': [
                'error',
                {
                    alphabetize: { order: 'asc', caseInsensitive: true },
                    'newlines-between': 'always',
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                        'object',
                    ],
                },
            ],
            'security/detect-unsafe-regex': 'error',
            'security/detect-child-process': 'error',
            'security/detect-eval-with-expression': 'error',
            'security/detect-new-buffer': 'error',
            'security/detect-non-literal-fs-filename': 'warn',
            'security/detect-non-literal-regexp': 'warn',
            'security/detect-non-literal-require': 'error',
            'security/detect-possible-timing-attacks': 'error',
            'security/detect-pseudoRandomBytes': 'error',
            'security/detect-object-injection': 'off',
        },
    },
    {
        files: ['apps/api/**/*.ts', 'e2e/**/*.ts', '*.config.ts'],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['apps/web/**/*.ts'],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ['apps/web/src/**/*.ts'],
        extends: [...angular.configs.tsRecommended],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/prefer-signals': [
                'error',
                {
                    preferInputSignals: true,
                    preferQuerySignals: true,
                    preferReadonlySignalProperties: true,
                    useTypeChecking: true,
                },
            ],
            '@angular-eslint/prefer-output-emitter-ref': 'error',
            '@angular-eslint/prefer-output-readonly': 'error',
            '@angular-eslint/prefer-signal-model': 'error',
            '@angular-eslint/prefer-inject': 'error',
            '@angular-eslint/prefer-on-push-component-change-detection':
                'error',
            '@angular-eslint/prefer-standalone': 'error',
            '@angular-eslint/prefer-host-metadata-property': 'error',
            '@angular-eslint/use-injectable-provided-in': 'error',
            '@angular-eslint/no-uncalled-signals': 'error',
            '@angular-eslint/component-selector': [
                'error',
                { type: 'element', prefix: 'wh', style: 'kebab-case' },
            ],
            '@angular-eslint/directive-selector': [
                'error',
                { type: 'attribute', prefix: 'wh', style: 'camelCase' },
            ],
        },
    },
    {
        files: ['apps/web/**/*.html'],
        extends: [
            ...angular.configs.templateRecommended,
            ...angular.configs.templateAccessibility,
        ],
        rules: {
            '@angular-eslint/template/prefer-control-flow': 'error',
            '@angular-eslint/template/prefer-at-else': 'error',
            '@angular-eslint/template/prefer-at-empty': 'error',
            '@angular-eslint/template/prefer-self-closing-tags': 'error',
        },
    },
    {
        files: ['apps/**/src/**/*.ts', 'packages/**/src/**/*.ts'],
        ignores: ['**/*.spec.ts'],
        plugins: { boundaries },
        settings: {
            'boundaries/files': layers.map(([category, pattern]) => ({
                category,
                pattern: pattern.endsWith('.ts') ? pattern : `${pattern}/**/*`,
            })),
        },
        rules: {
            'boundaries/dependencies': [
                'error',
                {
                    default: 'disallow',
                    policies: Object.entries(dependencies).map(
                        ([from, allow]) => ({
                            from: { file: { categories: from } },
                            allow: [from, ...allow].map(type => ({
                                to: { file: { categories: type } },
                            })),
                        })
                    ),
                },
            ],
        },
    },
    {
        files: ['apps/**/src/**/*.ts', 'packages/**/src/**/*.ts'],
        ignores: ['**/scene/**', '**/*.spec.ts'],
        rules: {
            'functional/immutable-data': [
                'error',
                {
                    ignoreClasses: 'fieldsOnly',
                    ignoreImmediateMutation: true,
                    ignoreMapsAndSets: true,
                    ignoreAccessorPattern: ['document.**', 'window.**'],
                },
            ],
        },
    },
    {
        files: ['apps/web/src/app/{ui,containers}/**/*.ts'],
        rules: {
            'no-restricted-syntax': ['error', ...syntax, restrictedEffect],
        },
    },
    {
        files: ['apps/web/src/app/ui/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        'three',
                        'angular-three',
                        '@ngrx/signals',
                        '@angular/common/http',
                        '@angular/forms',
                    ],
                    patterns: [
                        'angular-three/*',
                        'node:*',
                        'pg',
                        'drizzle-orm*',
                        '@winter/api',
                    ],
                },
            ],
            'no-restricted-syntax': [
                'error',
                ...syntax,
                restrictedEffect,
                {
                    selector: "CallExpression[callee.name='inject']",
                    message:
                        'Presentational UI receives inputs and emits outputs.',
                },
            ],
        },
    },
    {
        files: ['apps/web/src/**/*.ts'],
        ignores: ['**/data-access/**', '**/state/persisted.ts', '**/ui/**'],
        rules: {
            'no-restricted-globals': [
                'error',
                'fetch',
                'localStorage',
                'sessionStorage',
                'EventSource',
            ],
            'no-restricted-imports': [
                'error',
                {
                    patterns: ['node:*', 'pg', 'drizzle-orm*', '@winter/api'],
                    paths: [
                        {
                            name: '@angular/common/http',
                            importNames: ['HttpClient', 'httpResource'],
                            message: 'HTTP belongs in data-access.',
                        },
                        {
                            name: '@angular/forms',
                            importNames: ['FormsModule', 'ReactiveFormsModule'],
                            message: 'Use Signal Forms.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['apps/**/*.spec.ts', 'packages/**/*.spec.ts'],
        extends: [vitest.configs.recommended],
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: './tsconfig.spec.json',
            },
        },
        rules: {
            'functional/no-loop-statements': 'off',
            'functional/no-let': 'off',
            'vitest/consistent-test-it': ['error', { fn: 'it' }],
            'vitest/no-focused-tests': 'error',
            'vitest/no-disabled-tests': 'warn',
        },
    },
    prettier,
]);

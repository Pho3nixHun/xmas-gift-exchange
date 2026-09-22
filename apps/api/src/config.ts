import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { guidelinesSchema, publicConfigSchema } from '@winter/contracts';
import type { PublicConfig } from '@winter/contracts';
import { z } from 'zod';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const environmentSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    PUBLIC_ORIGIN: z.url().default('http://localhost:4200'),
    APP_CONFIG_FILE: z.string().default('config/app.example.json'),
    GUIDELINES_DIRECTORY: z.string().default('docs/content'),
    WORKBENCH_ENABLED: z.enum(['true', 'false']).default('false'),
    DATABASE_URL: z.string().optional(),
    DATABASE_URL_FILE: z.string().optional(),
    ORGANISER_HASH: z.string().optional(),
    ORGANISER_HASH_FILE: z.string().optional(),
    ALLOW_HTTP_COOKIES: z.enum(['true', 'false']).default('false'),
    PARTICIPANT_SESSION_DAYS: z.coerce
        .number()
        .int()
        .min(1)
        .max(180)
        .default(120),
    ORGANISER_SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
    RECOVERY_MINUTES: z.coerce.number().int().min(5).max(60).default(30),
    REAUTH_MINUTES: z.coerce.number().int().min(1).max(15).default(5),
    PREVIEWS_ENABLED: z.enum(['true', 'false']).default('false'),
    TRUST_PROXY: z.string().default(''),
    MAINTENANCE: z.enum(['true', 'false']).default('false'),
    REQUEST_BODY_BYTES: z.coerce
        .number()
        .int()
        .min(131072)
        .max(262144)
        .default(131072),
    DB_POOL_SIZE: z.coerce.number().int().min(2).max(30).default(10),
    DB_QUERY_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .min(1000)
        .max(30000)
        .default(5000),
});

export interface AppConfig {
    readonly host: string;
    readonly port: number;
    readonly origin: string;
    readonly databaseUrl: string | undefined;
    readonly staticRoot: string;
    readonly public: PublicConfig;
    readonly previewsEnabled: boolean;
    readonly trustedProxies: readonly string[];
    readonly maintenance: boolean;
    readonly bodyLimit: number;
    readonly database: {
        readonly poolSize: number;
        readonly queryTimeout: number;
    };
    readonly auth: {
        readonly organiserHash: string | undefined;
        readonly secure: boolean;
        readonly participantDays: number;
        readonly organiserHours: number;
        readonly recoveryMinutes: number;
        readonly reauthMinutes: number;
    };
}

// These paths are operator-controlled configuration, never participant input.
const readJson = async (path: string): Promise<unknown> => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- operator-configured local file
    const contents = await readFile(resolve(root, path), 'utf8');
    return JSON.parse(contents) as unknown;
};

export const loadConfig = async (
    environment: NodeJS.ProcessEnv
): Promise<AppConfig> => {
    const env = environmentSchema.parse(environment);
    if (env.DATABASE_URL && env.DATABASE_URL_FILE) {
        throw new Error('Set DATABASE_URL or DATABASE_URL_FILE, not both.');
    }
    const databaseUrl = env.DATABASE_URL_FILE
        ? // eslint-disable-next-line security/detect-non-literal-fs-filename -- operator-configured secret mount
          (await readFile(env.DATABASE_URL_FILE, 'utf8')).trim()
        : env.DATABASE_URL;
    if (env.NODE_ENV === 'production' && !databaseUrl) {
        throw new Error('Production requires database configuration.');
    }
    const origin = new URL(env.PUBLIC_ORIGIN);
    const organiserHash = await loadOrganiserHash(env);
    if (
        origin.origin !== env.PUBLIC_ORIGIN ||
        !['http:', 'https:'].includes(origin.protocol)
    ) {
        throw new Error(
            'PUBLIC_ORIGIN must be an HTTP(S) origin without a path.'
        );
    }
    const [settings, hu, en] = await Promise.all([
        readJson(env.APP_CONFIG_FILE),
        readJson(`${env.GUIDELINES_DIRECTORY}/guidelines.hu.json`),
        readJson(`${env.GUIDELINES_DIRECTORY}/guidelines.en.json`),
    ]);
    const base = publicConfigSchema
        .omit({ guidelines: true, workbenchEnabled: true })
        .parse(settings);
    return {
        host: env.HOST,
        port: env.PORT,
        origin: origin.origin,
        previewsEnabled: env.PREVIEWS_ENABLED === 'true',
        trustedProxies: parseProxies(env.TRUST_PROXY),
        maintenance: env.MAINTENANCE === 'true',
        bodyLimit: env.REQUEST_BODY_BYTES,
        database: {
            poolSize: env.DB_POOL_SIZE,
            queryTimeout: env.DB_QUERY_TIMEOUT_MS,
        },
        auth: {
            organiserHash,
            secure: origin.protocol === 'https:',
            participantDays: env.PARTICIPANT_SESSION_DAYS,
            organiserHours: env.ORGANISER_SESSION_HOURS,
            recoveryMinutes: env.RECOVERY_MINUTES,
            reauthMinutes: env.REAUTH_MINUTES,
        },
        databaseUrl,
        staticRoot: resolve(root, 'dist/web/browser'),
        public: publicConfigSchema.parse({
            ...base,
            workbenchEnabled: env.WORKBENCH_ENABLED === 'true',
            guidelines: {
                hu: guidelinesSchema.parse(hu),
                en: guidelinesSchema.parse(en),
            },
        }),
    };
};
const parseProxies = (value: string) =>
    z
        .array(
            z.string().refine(item => {
                const [address, prefix] = item.split('/');
                const family = isIP(address ?? '');
                return (
                    !!family &&
                    (prefix === undefined ||
                        (/^\d+$/u.test(prefix) &&
                            Number(prefix) <= (family === 4 ? 32 : 128)))
                );
            })
        )
        .parse(
            value
                .split(',')
                .map(item => item.trim())
                .filter(Boolean)
        );

const loadOrganiserHash = async (env: z.infer<typeof environmentSchema>) => {
    if (env.ORGANISER_HASH && env.ORGANISER_HASH_FILE)
        throw new Error('Set ORGANISER_HASH or ORGANISER_HASH_FILE, not both.');
    const hash = env.ORGANISER_HASH_FILE
        ? // eslint-disable-next-line security/detect-non-literal-fs-filename -- operator-configured secret mount
          (await readFile(env.ORGANISER_HASH_FILE, 'utf8')).trim()
        : env.ORGANISER_HASH;
    if (
        hash &&
        !/^\$argon2id\$v=19\$m=\d+,(?:t=\d+,p=\d+|p=\d+,t=\d+)\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/u.test(
            hash
        )
    )
        throw new Error('ORGANISER_HASH must be an Argon2id hash.');
    if (env.NODE_ENV === 'production' && !hash)
        throw new Error(
            'Production requires ORGANISER_HASH or ORGANISER_HASH_FILE.'
        );
    if (
        env.NODE_ENV === 'production' &&
        !env.PUBLIC_ORIGIN.startsWith('https:') &&
        env.ALLOW_HTTP_COOKIES !== 'true'
    )
        throw new Error(
            'Production requires HTTPS; local Docker testing must explicitly allow HTTP cookies.'
        );
    return hash;
};

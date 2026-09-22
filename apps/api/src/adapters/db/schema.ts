import { sql } from 'drizzle-orm';
import {
    boolean,
    check,
    pgTable,
    timestamp,
    uuid,
    varchar,
    text,
    integer,
    jsonb,
    primaryKey,
    unique,
    foreignKey,
} from 'drizzle-orm/pg-core';

export const seasons = pgTable(
    'season',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        singleton: boolean('singleton').notNull().default(true).unique(),
        status: varchar('status', { length: 8 }).notNull().default('setup'),
        setupRevision: integer('setup_revision').notNull().default(0),
        drawRevision: integer('draw_revision').notNull().default(0),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    table => [
        check('one_current_season', sql`${table.singleton} = true`),
        check('season_status', sql`${table.status} in ('setup', 'open')`),
    ]
);

const created = () =>
    timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
export const participants = pgTable('participant', {
    id: uuid('id').primaryKey().defaultRandom(),
    displayName: text('display_name').notNull(),
    normalizedName: text('normalized_name').notNull().unique(),
    passwordHash: text('password_hash'),
    generation: integer('generation').notNull().default(0),
    createdAt: created(),
});
export const exclusions = pgTable(
    'exclusion',
    {
        giverId: uuid('giver_id')
            .notNull()
            .references(() => participants.id, { onDelete: 'cascade' }),
        recipientId: uuid('recipient_id')
            .notNull()
            .references(() => participants.id, { onDelete: 'cascade' }),
    },
    t => [
        primaryKey({ columns: [t.giverId, t.recipientId] }),
        check('exclusion_not_self', sql`${t.giverId} <> ${t.recipientId}`),
    ]
);
export const slots = pgTable(
    'draw_slot',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        seasonId: uuid('season_id')
            .notNull()
            .references(() => seasons.id, { onDelete: 'cascade' }),
        giverId: uuid('giver_id')
            .notNull()
            .references(() => participants.id),
        recipientId: uuid('recipient_id')
            .notNull()
            .references(() => participants.id),
        ordinal: integer('ordinal').notNull(),
        color: text('color').notNull(),
    },
    t => [
        unique().on(t.seasonId, t.giverId, t.recipientId),
        unique().on(t.seasonId, t.giverId, t.ordinal),
        unique().on(t.id, t.seasonId, t.giverId, t.recipientId),
        check('slot_not_self', sql`${t.giverId} <> ${t.recipientId}`),
        check('slot_color', sql`${t.color} in ('red','purple','blue','gold')`),
    ]
);
export const assignments = pgTable(
    'assignment',
    {
        seasonId: uuid('season_id')
            .notNull()
            .references(() => seasons.id, { onDelete: 'cascade' }),
        giverId: uuid('giver_id')
            .notNull()
            .references(() => participants.id),
        recipientId: uuid('recipient_id')
            .notNull()
            .references(() => participants.id),
        slotId: uuid('slot_id').notNull(),
        createdAt: created(),
    },
    t => [
        primaryKey({ columns: [t.seasonId, t.giverId] }),
        unique().on(t.seasonId, t.recipientId),
        check('assignment_not_self', sql`${t.giverId} <> ${t.recipientId}`),
        foreignKey({
            columns: [t.slotId, t.seasonId, t.giverId, t.recipientId],
            foreignColumns: [
                slots.id,
                slots.seasonId,
                slots.giverId,
                slots.recipientId,
            ],
        }),
    ]
);
export const wishes = pgTable(
    'wish',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        seasonId: uuid('season_id')
            .notNull()
            .references(() => seasons.id, { onDelete: 'cascade' }),
        ownerId: uuid('owner_id')
            .notNull()
            .references(() => participants.id),
        description: text('description').notNull(),
        url: text('url').notNull().default(''),
        priority: text('priority').notNull(),
        contentVersion: integer('content_version').notNull().default(1),
        createdAt: created(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    t => [
        check('wish_priority', sql`${t.priority} in ('low','medium','high')`),
        check(
            'wish_description',
            sql`char_length(${t.description}) between 1 and 500`
        ),
    ]
);
export const claims = pgTable('wish_claim', {
    wishId: uuid('wish_id')
        .primaryKey()
        .references(() => wishes.id, { onDelete: 'cascade' }),
    claimerId: uuid('claimer_id')
        .notNull()
        .references(() => participants.id),
    createdAt: created(),
});
export const sessions = pgTable(
    'session',
    {
        tokenHash: text('token_hash').primaryKey(),
        csrf: text('csrf').notNull(),
        role: text('role').notNull(),
        participantId: uuid('participant_id').references(
            () => participants.id,
            { onDelete: 'cascade' }
        ),
        seasonId: uuid('season_id'),
        generation: integer('generation'),
        organiserVersion: text('organiser_version'),
        reauthenticatedAt: timestamp('reauthenticated_at', {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        createdAt: created(),
    },
    t => [
        check(
            'session_role',
            sql`(${t.role} = 'participant' and ${t.participantId} is not null and ${t.seasonId} is not null and ${t.generation} is not null) or (${t.role} = 'organiser' and ${t.participantId} is null and ${t.organiserVersion} is not null)`
        ),
    ]
);
export const receipts = pgTable(
    'mutation_receipt',
    {
        actor: text('actor').notNull(),
        seasonId: uuid('season_id').notNull(),
        operation: text('operation').notNull(),
        key: uuid('key').notNull(),
        digest: text('digest').notNull(),
        status: integer('status').notNull(),
        response: jsonb('response')
            .$type<Readonly<Record<string, unknown>>>()
            .notNull(),
    },
    t => [primaryKey({ columns: [t.actor, t.seasonId, t.operation, t.key] })]
);
export const recoveries = pgTable('password_recovery', {
    tokenHash: text('token_hash').primaryKey(),
    participantId: uuid('participant_id')
        .notNull()
        .unique()
        .references(() => participants.id, { onDelete: 'cascade' }),
    seasonId: uuid('season_id')
        .notNull()
        .references(() => seasons.id, { onDelete: 'cascade' }),
    generation: integer('generation').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const recoveryAudit = pgTable('recovery_audit', {
    id: uuid('id').primaryKey().defaultRandom(),
    seasonId: uuid('season_id')
        .notNull()
        .references(() => seasons.id, { onDelete: 'cascade' }),
    participantId: uuid('participant_id')
        .notNull()
        .references(() => participants.id, { onDelete: 'cascade' }),
    issuer: text('issuer').notNull(),
    outcome: text('outcome').notNull(),
    createdAt: created(),
});
export const previews = pgTable(
    'preview_cache',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        seasonId: uuid('season_id')
            .notNull()
            .references(() => seasons.id, { onDelete: 'cascade' }),
        urlHash: text('url_hash').notNull(),
        status: text('status').notNull(),
        title: text('title').notNull().default(''),
        site: text('site').notNull().default(''),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    },
    t => [unique().on(t.seasonId, t.urlHash)]
);

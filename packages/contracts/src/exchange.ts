import { z } from 'zod';

import { wishDraftSchema } from './index.js';

export const idSchema = z.uuid();
export const personSchema = z.strictObject({
    id: idSchema,
    displayName: z.string(),
});
export const seasonSchema = z.strictObject({
    id: idSchema,
    status: z.enum(['setup', 'open']),
    setupRevision: z.number().int(),
    drawRevision: z.number().int(),
});
export const bootstrapSchema = z.strictObject({
    season: seasonSchema,
    people: z.array(personSchema.extend({ protected: z.boolean() })),
});
export const passwordSchema = z
    .string()
    .min(8)
    .max(128)
    .refine(
        value =>
            Array.from(value).length >= 8 &&
            [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[\p{P}\p{S}]/u].filter(pattern =>
                pattern.test(value)
            ).length >= 3,
        'Use at least 8 characters and three of: lowercase, uppercase, numbers, special characters.'
    );
export const credentialsSchema = z.strictObject({
    seasonId: idSchema,
    participantId: idSchema,
    password: z.string().min(1).max(128),
});
export const enrolmentSchema = credentialsSchema.extend({
    password: passwordSchema,
});
export const passwordOnlySchema = z.strictObject({
    password: z.string().min(1).max(128),
});
export const recoverySchema = z.strictObject({
    token: z.string().min(32).max(100),
    newPassword: passwordSchema,
});
export const seasonCommandSchema = z.strictObject({ seasonId: idSchema });
export const drawCommandSchema = seasonCommandSchema.extend({
    slotId: idSchema,
});
export const meSchema = z.strictObject({
    person: personSchema,
    seasonId: idSchema,
    csrf: z.string(),
});
export const assignmentSchema = z.strictObject({
    viewerId: idSchema,
    seasonId: idSchema,
    recipient: personSchema.nullable(),
    slotId: idSchema.nullable(),
});
export const poolSchema = z.strictObject({
    viewerId: idSchema,
    seasonId: idSchema,
    drawRevision: z.number().int(),
    slots: z.array(
        z.strictObject({
            slotId: idSchema,
            ordinal: z.number().int(),
            color: z.enum(['red', 'purple', 'blue', 'gold']),
            available: z.boolean(),
        })
    ),
});
const displayName = z
    .string()
    .refine(value => !/[\p{Cc}\p{Cf}]/u.test(value))
    .transform(value => value.normalize('NFC').trim().replace(/\s+/gu, ' '))
    .refine(
        value =>
            Array.from(value).length > 0 &&
            Array.from(value).length <= 80 &&
            !/[\p{Cc}\p{Cf}]/u.test(value)
    );
export const setupCommandSchema = seasonCommandSchema.extend({
    expectedVersion: z.number().int().nonnegative(),
    people: z
        .array(z.strictObject({ id: idSchema, displayName }))
        .min(2)
        .max(30),
    exclusions: z
        .array(z.strictObject({ giverId: idSchema, recipientId: idSchema }))
        .max(870),
});
export const setupSchema = z.strictObject({
    season: seasonSchema,
    csrf: z.string(),
    people: z.array(personSchema.extend({ protected: z.boolean() })),
    exclusions: z.array(
        z.strictObject({ giverId: idSchema, recipientId: idSchema })
    ),
});
export const openSchema = seasonCommandSchema.extend({
    expectedVersion: z.number().int(),
});
export const resetSchema = seasonCommandSchema.extend({
    confirmation: z.literal('RESET'),
});
export const createWishSchema = wishDraftSchema.extend({ seasonId: idSchema });
export const editWishSchema = createWishSchema.extend({
    expectedVersion: z.number().int().positive(),
});
export const versionCommandSchema = seasonCommandSchema.extend({
    expectedVersion: z.number().int().positive(),
});
export const wishSchema = wishDraftSchema.extend({
    id: idSchema,
    ownerId: idSchema,
    contentVersion: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    claimState: z.enum(['available', 'mine', 'claimed']).optional(),
});
export const wishListSchema = z.strictObject({
    viewerId: idSchema,
    seasonId: idSchema,
    wishes: z.array(wishSchema),
    nextCursor: z.string().nullable(),
});
export type Person = Readonly<z.infer<typeof personSchema>>;
export type Bootstrap = Readonly<z.infer<typeof bootstrapSchema>>;
export type Identity = Readonly<z.infer<typeof meSchema>>;
export type Assignment = Readonly<z.infer<typeof assignmentSchema>>;
export type DrawPool = Readonly<z.infer<typeof poolSchema>>;
export type Setup = Readonly<z.infer<typeof setupSchema>>;
export type SetupCommand = Readonly<z.infer<typeof setupCommandSchema>>;
export type Wish = Readonly<z.infer<typeof wishSchema>>;
export type WishList = Readonly<z.infer<typeof wishListSchema>>;

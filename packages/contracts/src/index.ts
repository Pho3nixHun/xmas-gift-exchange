import { z } from 'zod';

export const localeSchema = z.enum(['hu', 'en']);
export type Locale = z.infer<typeof localeSchema>;
export const prioritySchema = z.enum(['low', 'medium', 'high']);
export type Priority = z.infer<typeof prioritySchema>;

const codePoints = (value: string) => Array.from(value).length;
const safeProductUrl = (value: string) => {
    const result = z.url().safeParse(value);
    if (!result.success) return false;
    const url = new URL(result.data);
    return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password
    );
};

export const wishDraftSchema = z.strictObject({
    description: z
        .string()
        .trim()
        .refine(
            value => codePoints(value) >= 1 && codePoints(value) <= 500,
            'DESCRIPTION_LENGTH'
        ),
    url: z
        .string()
        .trim()
        .max(2048)
        .refine(value => value === '' || safeProductUrl(value), 'INVALID_URL'),
    priority: prioritySchema,
});
export type WishDraft = Readonly<z.infer<typeof wishDraftSchema>>;
export const wishCheckSchema = z.strictObject({ wish: wishDraftSchema });
export type WishCheck = z.infer<typeof wishCheckSchema>;

export const guidelinesSchema = z.strictObject({
    title: z.string(),
    subtitle: z.string(),
    main_rule: z.string(),
    avoid_title: z.string(),
    avoid_items: z.array(z.string()),
    consider_title: z.string(),
    consider_items: z.array(z.string()),
    budget_title: z.string(),
    budget_range: z.string(),
    budget_note: z.string(),
    tip_title: z.string(),
    tips: z.array(z.string()),
    remember: z.string(),
});
export type Guidelines = Readonly<z.infer<typeof guidelinesSchema>>;

export const audioConfigSchema = z.strictObject({
    backgroundMusic: z
        .string()
        .max(500)
        .regex(/^\/(?!\/)[A-Za-z0-9_./%-]+\.(?:mp3|m4a|ogg|wav)$/iu)
        .nullable()
        .default(null),
    musicVolume: z.number().min(0).max(1).default(0.2),
});

export const publicConfigSchema = z.strictObject({
    brand: z.string().min(1).max(80),
    seasonLabel: z.string().min(1).max(80),
    defaultLocale: localeSchema,
    organiserContact: z.string().max(300),
    workbenchEnabled: z.boolean(),
    audio: audioConfigSchema.default({
        backgroundMusic: null,
        musicVolume: 0.2,
    }),
    quality: z.strictObject({ maxDpr: z.number().min(0.75).max(2) }),
    guidelines: z.strictObject({ hu: guidelinesSchema, en: guidelinesSchema }),
});
export type PublicConfig = Readonly<z.infer<typeof publicConfigSchema>>;

export const apiErrorSchema = z.strictObject({
    error: z.strictObject({
        code: z.enum([
            'VALIDATION_FAILED',
            'ORIGIN_REJECTED',
            'NOT_FOUND',
            'INTERNAL_ERROR',
        ]),
        requestId: z.string(),
    }),
});

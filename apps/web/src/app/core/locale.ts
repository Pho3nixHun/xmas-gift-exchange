export const supportedLocale = (
    languages: readonly string[]
): 'hu' | 'en' | null =>
    languages
        .map(language => language.toLowerCase().split('-')[0])
        .find(language => language === 'hu' || language === 'en') ?? null;

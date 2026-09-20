# Existing family gift guidelines

These are the previous application's actual `rules` dictionaries, recovered
from git history at the user's request. They replace the invented prototype
budgets as the production defaults.

| Locale    | Budget wording from history                | Full content                             |
| --------- | ------------------------------------------ | ---------------------------------------- |
| Hungarian | Célozz meg 15000-20000 Ft közötti összeget | [guidelines.hu.json](guidelines.hu.json) |
| English   | Aim for $30-60 (or local equivalent)       | [guidelines.en.json](guidelines.en.json) |

Provenance: `src/i18n/locales/hu.json` and `src/i18n/locales/en.json`, `rules`
property, introduced by commit `1f5f26d` (`feat: rules added`) and unchanged
at `78a9197` (`fix: mobile layout issues`). Compare with:

```sh
git show 1f5f26d:src/i18n/locales/hu.json
git show 78a9197:src/i18n/locales/en.json
```

The JSON files preserve every guideline string and array verbatim, including
punctuation and emojis. The advice covers avoiding generic/filler gifts,
choosing thoughtful interests/quality/experiences/personal gifts, consulting
wishes and adding a personal note. Their key sets match and can seed production
locale configuration; no old React source needs to be restored.

The historical English amount is dollars, not the prototype's euros. Keep
both locale versions as supplied; do not calculate exchange rates or silently
rewrite either budget. Future changes use versioned deployment content files.
The live design prototype may still display its old sample copy; this content
and the product specification govern production implementation.

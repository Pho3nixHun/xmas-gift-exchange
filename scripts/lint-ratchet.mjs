import { readFile } from 'node:fs/promises';

import { ESLint } from 'eslint';

const baseline = JSON.parse(
    await readFile(new URL('../eslint-ratchet.json', import.meta.url), 'utf8')
).warnings;
const eslint = new ESLint({
    cache: true,
    cacheLocation: 'node_modules/.cache/eslint',
});
const results = await eslint.lintFiles(['.']);
const counts = results
    .flatMap(result => result.messages)
    .filter(message => message.severity === 1)
    .reduce(
        (all, message) => ({
            ...all,
            [message.ruleId]: (all[message.ruleId] ?? 0) + 1,
        }),
        {}
    );
const failed =
    results.some(result => result.errorCount > 0) ||
    Object.entries(counts).some(
        ([rule, count]) => count > (baseline[rule] ?? 0)
    );
const formatter = await eslint.loadFormatter('stylish');
process.stdout.write(formatter.format(results));
process.stdout.write(
    failed
        ? 'Lint ratchet failed.\n'
        : 'Lint ratchet: no errors or warning increases.\n'
);
process.exitCode = failed ? 1 : 0;

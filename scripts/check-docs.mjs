import { readFile, readdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const collect = async directory => {
    const entries = await readdir(directory, { withFileTypes: true });
    return (
        await Promise.all(
            entries.map(entry =>
                entry.isDirectory()
                    ? collect(resolve(directory, entry.name))
                    : [resolve(directory, entry.name)]
            )
        )
    ).flat();
};
const files = [
    resolve('README.md'),
    ...(await collect('docs')).filter(file => file.endsWith('.md')),
];
const required = [
    'docs/spec.md',
    'docs/ux-ui.md',
    'docs/implementation-plan.md',
    'docs/engineering/architecture.md',
    'docs/engineering/coding-standards.md',
    'docs/engineering/data-api.md',
    'docs/engineering/draw-protocol.md',
    'docs/engineering/realtime.md',
    'docs/engineering/account-recovery.md',
    'docs/engineering/deployment.md',
];
await Promise.all(required.map(file => access(file)));
const spec = await readFile('docs/spec.md', 'utf8');
const identifiers = new Set(
    [...spec.matchAll(/(?:FR|INV)-\d{2}/g)].map(match => match[0])
);
const failures = (
    await Promise.all(
        files.map(async file => {
            const content = await readFile(file, 'utf8');
            const targets = [
                ...content.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g),
            ].map(match => match[1]);
            const unknownIds = [...content.matchAll(/(?:FR|INV)-\d{2}/g)]
                .map(match => match[0])
                .filter(id => !identifiers.has(id))
                .map(id => `${file}: unknown requirement ${id}`);
            return [
                ...unknownIds,
                ...(await Promise.all(
                    targets
                        .filter(target => !/^(?:https?:|#)/.test(target))
                        .map(async target => {
                            const path = decodeURIComponent(
                                target.split('#')[0]
                            );
                            try {
                                await access(resolve(dirname(file), path));
                                return null;
                            } catch {
                                return `${file}: ${target}`;
                            }
                        })
                )),
            ];
        })
    )
)
    .flat()
    .filter(Boolean);
failures.forEach(failure => process.stderr.write(`${failure}\n`));
process.stdout.write(
    `Checked ${files.length} documentation files; ${failures.length} missing references.\n`
);
process.exitCode = failures.length ? 1 : 0;

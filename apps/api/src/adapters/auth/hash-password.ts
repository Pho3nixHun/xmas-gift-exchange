import { readFileSync } from 'node:fs';

import { passwordSchema } from '@winter/contracts/exchange';

import { passwords } from './passwords.js';

if (process.stdin.isTTY) {
    console.error(
        'Read the password silently in your shell and pipe it to this command. See README.md.'
    );
    process.exit(1);
}
const password = readFileSync(0, 'utf8').replace(/\r?\n$/u, '');
if (!passwordSchema.safeParse(password).success) {
    console.error(
        'Use 8–128 characters and at least three of: lowercase, uppercase, numbers, special characters.'
    );
    process.exit(1);
}
process.stdout.write(`${await passwords().hash(password)}\n`);

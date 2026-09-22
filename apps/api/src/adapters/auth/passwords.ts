import { createHash, randomBytes } from 'node:crypto';

import { argon2id, hash, verify } from 'argon2';

import { fail } from '../../errors.js';

export const digest = (value: string) =>
    createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');

export const passwords = () => {
    const active = new Set<symbol>();
    const waiting = new Map<symbol, () => void>();
    const bounded = async <T>(action: () => Promise<T>): Promise<T> => {
        const task = Symbol();
        if (active.size >= 2) {
            if (waiting.size >= 30) return fail('BUSY', 503);
            await new Promise<void>(resolve => waiting.set(task, resolve));
        } else active.add(task);
        try {
            return await action();
        } finally {
            active.delete(task);
            const next = waiting.entries().next().value;
            if (next) {
                waiting.delete(next[0]);
                active.add(next[0]);
                next[1]();
            }
        }
    };
    return {
        hash: (password: string) =>
            bounded(() =>
                hash(password, {
                    type: argon2id,
                    memoryCost: 65536,
                    timeCost: 3,
                    parallelism: 1,
                })
            ),
        verify: (encoded: string, password: string) =>
            bounded(() => verify(encoded, password)),
    };
};

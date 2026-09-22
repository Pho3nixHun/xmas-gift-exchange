import { describe, expect, it } from 'vitest';

import {
    credentialsSchema,
    enrolmentSchema,
    passwordSchema,
    recoverySchema,
} from './exchange.js';

describe('new password policy', () => {
    it.each([
        'Abcdef12',
        'Abcdef!?',
        'abcdef1!',
        'ABCDEF1!',
        'Árvíz12ű',
        'ÁRVÍZ12!',
        'Abcdef1!',
        'A long phrase 1',
    ])(
        'accepts eight or more characters with at least three types: %s',
        password => {
            expect(passwordSchema.safeParse(password).success).toBe(true);
        }
    );
    it.each([
        'Abcd1!?',
        'abcdefgh',
        'ABCDEFGH',
        '12345678',
        '!@#$%^&*',
        'Abcdefgh',
        'abcdef12',
        'abcdef!?',
        'ABCDEF12',
        'ABCDEF!?',
        '123456!?',
        'abcde1  ',
        'Aa1!' + 'a'.repeat(125),
    ])('rejects short passwords or fewer than three types: %s', password => {
        expect(passwordSchema.safeParse(password).success).toBe(false);
    });
    it('requires eight Unicode characters even when symbols use surrogate pairs', () => {
        expect(passwordSchema.safeParse('Ab1🎄🎄🎄🎄').success).toBe(false);
        expect(passwordSchema.safeParse('Ab1🎄🎄🎄🎄🎄').success).toBe(true);
    });
    it('enforces the same rule on enrolment and recovery while allowing legacy sign-in', () => {
        const credentials = {
            seasonId: '6d9ef72b-9cae-4c17-93ee-c47b35021b68',
            participantId: '6d9ef72b-9cae-4c17-93ee-c47b35021b69',
            password: 'old-winter-password',
        };
        expect(credentialsSchema.safeParse(credentials).success).toBe(true);
        expect(enrolmentSchema.safeParse(credentials).success).toBe(false);
        expect(
            recoverySchema.safeParse({
                token: 'a'.repeat(32),
                newPassword: credentials.password,
            }).success
        ).toBe(false);
        expect(
            enrolmentSchema.safeParse({ ...credentials, password: 'Abcdef12' })
                .success
        ).toBe(true);
        expect(
            recoverySchema.safeParse({
                token: 'a'.repeat(32),
                newPassword: 'Abcdef12',
            }).success
        ).toBe(true);
    });
});

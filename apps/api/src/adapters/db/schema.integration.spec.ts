import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

const connectionString = process.env['TEST_DATABASE_URL'];
if (!connectionString)
    expect.fail('Set TEST_DATABASE_URL to an isolated migrated test database.');
const pool = new pg.Pool({ connectionString });
afterAll(() => pool.end());

describe('PostgreSQL foundation migration', () => {
    it('enforces one current season and rejects invalid statuses', async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                "INSERT INTO season (status) VALUES ('setup') ON CONFLICT DO NOTHING"
            );
            await client.query('SAVEPOINT duplicate');
            await expect(
                client.query("INSERT INTO season (status) VALUES ('setup')")
            ).rejects.toMatchObject({ code: '23505' });
            await client.query('ROLLBACK TO SAVEPOINT duplicate');
            await expect(
                client.query("UPDATE season SET status = 'invalid'")
            ).rejects.toMatchObject({ code: '23514' });
        } finally {
            await client.query('ROLLBACK');
            client.release();
        }
    });
});

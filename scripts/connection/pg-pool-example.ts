/**
 * Example showing how to use `pg.Pool` for connection pooling to Postgres.
 * This file is illustrative — install `pg` and set `DATABASE_URL` in env.
 */
async function example() {
  try {
    // lazy require to avoid build-time dependency if not installed
    // eslint-disable-next-line no-eval
    const { Pool } = eval("require")("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const res = await pool.query("SELECT NOW()");
    console.log("PG NOW", res.rows[0]);
    await pool.end();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      "pg not installed or DATABASE_URL not set",
      (e as any)?.message || String(e),
    );
  }
}

if (require.main === module) example().catch(() => process.exit(1));

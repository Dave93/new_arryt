import { open } from '@evan/duckdb';

const db = await open(process.env.DUCK_MAINDB_PATH);
export const duckdb = await db.connect();
process.on("beforeExit", (code) => {
    duckdb.close();
    db.close();
});

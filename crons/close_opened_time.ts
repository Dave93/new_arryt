import { db } from "@api/src/lib/db";
import { eq } from "drizzle-orm";
import { work_schedule_entries, users } from "@api/drizzle/schema";
import Redis from "ioredis";
import { CacheControlService } from "@api/src/modules/cache/service";

export const redisClient = new Redis({
    maxRetriesPerRequest: null,
    port: 6379,
    host: '127.0.0.1',
});

const cacheControl = new CacheControlService(db, redisClient);

async function main() {
    try {
        const openTimeEntries = await db.select({
            id: work_schedule_entries.id,
            date_start: work_schedule_entries.date_start,
            user_id: work_schedule_entries.user_id,
        })
            .from(work_schedule_entries)
            .where(
                eq(work_schedule_entries.current_status, "open")
            );

        for (const openTimeEntry of openTimeEntries) {
            try {
                const dateStart = new Date(openTimeEntry.date_start);
                const dateEnd = new Date();
                // get duration in seconds
                const duration = Math.floor((dateEnd.getTime() - dateStart.getTime()) / 1000);
                await db.update(work_schedule_entries).set({
                    ip_close: '127.0.0.1',
                    current_status: "closed",
                    duration,
                    date_finish: new Date().toISOString(),
                }).where(eq(work_schedule_entries.id, openTimeEntry.id));

                await db.update(users).set({
                    is_online: false,
                }).where(eq(users.id, openTimeEntry.user_id));

                await redisClient.hdel(`${process.env.PROJECT_PREFIX}_user_location`, openTimeEntry.user_id);
                await cacheControl.cacheUser(openTimeEntry.user_id);
            } catch (e) {
                console.error('Error processing entry:', e);
            }
        }

        console.log('Everything is done');
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        // Close the Redis connection
        await redisClient.quit();
        // If you're using a connection pool with your database, you may need to close it here as well
        // For example: await db.end()
        process.exit(0);
    }
}

main();
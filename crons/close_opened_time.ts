import { db } from "@api/src/lib/db";
import { eq } from "drizzle-orm";
import { work_schedule_entries, users } from "@api/drizzle/schema";
import Redis from "ioredis";
import { CacheControlService } from "@api/src/modules/cache/service";
import { settleDailyGarant, settingHour } from "@api/src/services/daily_garant/service";
import { businessDayOf } from "@api/src/services/daily_garant/calculate";
import { getSetting } from "@api/src/utils/settings";

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

        // Большинство смен (64% за последний месяц) закрывает этот крон, а не
        // курьер. Поэтому дневной гарант начисляем и здесь, а не только при
        // закрытии смены кнопкой. Выключатель тот же — daily_garant_auto_enabled.
        const garantEnabled = (await getSetting(redisClient, "daily_garant_auto_enabled")) === "true";
        const workEndHour = settingHour(await getSetting(redisClient, "work_end_time"), 4);
        const garantJobs: { courierId: string; day: string }[] = [];

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

                if (garantEnabled) {
                    garantJobs.push({
                        courierId: openTimeEntry.user_id,
                        day: businessDayOf(openTimeEntry.date_start, workEndHour),
                    });
                }
            } catch (e) {
                console.error('Error processing entry:', e);
            }
        }

        // Гарант — после закрытия всех смен; ошибка у одного курьера не мешает
        // остальным, а повторный запуск за тот же день безопасен.
        for (const job of garantJobs) {
            try {
                const r = await settleDailyGarant({ db, redis: redisClient, cacheControl }, job);
                console.log(
                    `[daily_garant] courier=${r.courierId} day=${r.day} status=${r.status}` +
                        (r.reason ? ` reason=${r.reason}` : "") +
                        (r.payout !== undefined ? ` payout=${r.payout} earned=${r.earned} penalty=${r.penalty}` : "")
                );
            } catch (e) {
                console.error(`[daily_garant] courier=${job.courierId} day=${job.day} failed:`, e);
            }
        }

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
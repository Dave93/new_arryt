import { users } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import Redis from "ioredis";

type PushCourierToQueueData = {
    courier_id: string;
    terminal_id: string;
    workStartTime: number;
    workEndTime: number;
}

export default async function processSetQueueLastCourier(redis: Redis, db: DB, cacheControl: CacheControlService, data: PushCourierToQueueData) {
    const { courier_id, terminal_id, workStartTime, workEndTime } = data;

    const terminals = await cacheControl.getTerminals();

    const terminal = terminals.find((terminal) => terminal.id === terminal_id);
    if (!terminal) {
        return;
    }

    let orderQueueKey = `${process.env.PROJECT_PREFIX}_last_courier`;

    const courier = (await db.select({
        id: users.id,
        drive_type: users.drive_type
    }).from(users).where(eq(users.id, courier_id)).execute())[0];

    if (courier.drive_type === 'foot') {
        orderQueueKey += '_foot';
    }

    let queueTerminals = [terminal_id];
    if (terminal.linked_terminal_id) {
        const linkedTerminal = terminals.find((terminal) => terminal.id === terminal.linked_terminal_id);
        if (linkedTerminal) {
            queueTerminals.push(linkedTerminal.id);
        }
    }

    orderQueueKey += `_${queueTerminals.sort().join('_')}`;

    const currentTime = dayjs().hour();

    let currentDate = dayjs().format('YYYY_MM_DD');

    if (currentTime < workEndTime) {
        currentDate = dayjs().subtract(1, 'day').format('YYYY_MM_DD');
    }

    orderQueueKey += `_${currentDate}`;

    // Check if courier_id exists in the Redis list
    await redis.set(orderQueueKey, courier_id);
}
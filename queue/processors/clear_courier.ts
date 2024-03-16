import { DB } from "@api/src/lib/db";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { order_actions, orders, users } from "@api/drizzle/schema";
import Redis from "ioredis";
import { CacheControlService } from "@api/src/modules/cache/service";

type orderChangeStatusData = {
    order_id: string;
    user_id: string;
    courier_id: string;
};

export default async function processClearCourier(redis: Redis, db: DB, cacheControl: CacheControlService, data: orderChangeStatusData) {

    const order = await db.select({
        id: orders.id,
        terminal_id: orders.terminal_id,
        created_at: orders.created_at,
    }).from(orders).where(
        eq(orders.id, data.order_id)
    ).execute();

    const courier = await db.select({
        id: users.id,
        last_name: users.last_name,
        first_name: users.first_name,
    }).from(users).where(
        eq(users.id, data.courier_id)
    ).execute();

    await db.insert(order_actions).values({
        terminal_id: order[0].terminal_id,
        order_id: data.order_id,
        order_created_at: order[0].created_at,
        action: 'STATUS_CHANGE',
        action_text: `Убран курьер с заказа. Прошлый курьер ${courier[0].last_name} ${courier[0].first_name}`,
        duration: 0,
        created_by: data.user_id,
    }).execute();

}
import { DB } from "@api/src/lib/db";
import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { order_actions, orders, users } from "@api/drizzle/schema";
import Redis from "ioredis";
import { CacheControlService } from "@api/src/modules/cache/service";

type orderChangeStatusData = {
    order_id: string;
    user_id: string;
    before_courier_id?: string;
    after_courier_id: string;
};

export default async function processChangeCourier(redis: Redis, db: DB, cacheControl: CacheControlService, data: orderChangeStatusData) {

    const order = await db.select({
        id: orders.id,
        terminal_id: orders.terminal_id,
        created_at: orders.created_at,
    }).from(orders).where(
        eq(orders.id, data.order_id)
    ).execute();

    const couriers = await db.select({
        id: users.id,
        last_name: users.last_name,
        first_name: users.first_name,
    }).from(users).where(
        or(
            eq(users.id, data.after_courier_id),
            data.before_courier_id ? eq(users.id, data.before_courier_id) : undefined
        )
    ).execute();

    const beforeCourier = couriers.find((courier) => courier.id === data.before_courier_id);
    const afterCourier = couriers.find((courier) => courier.id === data.after_courier_id);

    await db.insert(order_actions).values({
        terminal_id: order[0].terminal_id,
        order_id: data.order_id,
        order_created_at: order[0].created_at,
        action: 'STATUS_CHANGE',
        action_text: couriers.length > 1 ? `Курьер изменен с "${beforeCourier!.last_name} ${beforeCourier!.first_name}" на "${afterCourier!.last_name} ${afterCourier!.first_name}"` : `Курьер назначен "${afterCourier!.last_name} ${afterCourier!.first_name}"`,
        duration: 0,
        created_by: data.user_id,
    }).execute();

}
import { DB } from "@api/src/lib/db";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { order_actions, orders, users } from "@api/drizzle/schema";
import Redis from "ioredis";
import { CacheControlService } from "@api/src/modules/cache/service";
import { Queue } from "bullmq";

type orderChangeStatusData = {
    before_status_id: string;
    after_status_id: string;
    order_id: string;
    user_id: string;
};

export default async function processChangeStatus(redis: Redis, db: DB, cacheControl: CacheControlService, data: orderChangeStatusData) {

    const orderStatuses = await cacheControl.getOrderStatuses();
    const beforeStatus = orderStatuses.find((status) => status.id === data.before_status_id);
    const afterStatus = orderStatuses.find((status) => status.id === data.after_status_id);

    if (!beforeStatus || !afterStatus) {
        return;
    }

    const lastOrderAction = await db.select({
        id: order_actions.id,
        created_at: order_actions.created_at,
    })
        .from(order_actions)
        .where(
            and(
                eq(order_actions.order_id, data.order_id),
                eq(order_actions.action, 'STATUS_CHANGE'),
            )
        )
        .orderBy(desc(order_actions.created_at))
        .limit(1);

    const lastOrderActionCreatedAt = lastOrderAction[0]?.created_at;
    const lastOrderActionCreatedAtDifference = lastOrderActionCreatedAt
        ? Math.floor((new Date().getTime() - new Date(lastOrderActionCreatedAt).getTime()) / 1000)
        : 0;

    const order = await db.select({
        id: orders.id,
        terminal_id: orders.terminal_id,
        created_at: orders.created_at,
    }).from(orders).where(
        eq(orders.id, data.order_id)
    ).execute();

    await db.insert(order_actions).values({
        terminal_id: order[0].terminal_id,
        order_id: data.order_id,
        order_created_at: order[0].created_at,
        action: 'STATUS_CHANGE',
        action_text: `Статус заказа изменен c "${beforeStatus.name}" на "${afterStatus.name}"`,
        duration: lastOrderActionCreatedAtDifference,
        created_by: data.user_id,
    }).execute();
    console.log('processChangeStatus', data.order_id, data.before_status_id, data.after_status_id, data.user_id, lastOrderActionCreatedAtDifference);
    if (afterStatus.finish || afterStatus.cancel) {
        await db.update(orders).set({
            finished_date: new Date().toISOString(),
        }).where(
            eq(orders.id, data.order_id)
        ).execute();
    }
}
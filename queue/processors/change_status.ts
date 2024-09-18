import { DB } from "@api/src/lib/db";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { order_actions, orders, users } from "@api/drizzle/schema";
import Redis from "ioredis";
import { CacheControlService } from "@api/src/modules/cache/service";
import { Queue } from "bullmq";
import dayjs from "dayjs";

type orderChangeStatusData = {
    before_status_id: string;
    after_status_id: string;
    order_id: string;
    user_id: string;
};

export default async function processChangeStatus(redis: Redis, db: DB, cacheControl: CacheControlService, data: orderChangeStatusData, processOrderCompleteQueue: Queue) {

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

        if (afterStatus?.finish) {

            const ordersListPrepare = await db
                .select()
                .from(orders)
                .where(and(
                    eq(orders.id, sql.placeholder('order_id')),
                    gte(orders.created_at, sql.placeholder('startDate')),
                    lte(orders.created_at, sql.placeholder('endDate')),
                ))
                .limit(1)
                .orderBy(asc(orders.created_at))
                .prepare('queue_find_order')

            const ordersList = await ordersListPrepare
                .execute({
                    order_id: data.order_id,
                    startDate: dayjs().subtract(4, 'days').format('YYYY-MM-DD HH:mm:ss'),
                    endDate: dayjs().add(2, 'days').format('YYYY-MM-DD HH:mm:ss')
                });

            await processOrderCompleteQueue.add(ordersList[0].id, ordersList[0], {
                attempts: 3, removeOnComplete: true
            });
        }
    }

}
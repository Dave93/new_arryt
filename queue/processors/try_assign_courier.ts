import { delivery_pricing, orders } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { and, eq } from "drizzle-orm";
import Redis from "ioredis";

type TryAssignCourierData = {
    order_id: string;
    created_at: string;
}

export default async function processTryAssignCourier(redis: Redis, db: DB, cacheControl: CacheControlService, data: TryAssignCourierData) {
    console.time('processTryAssignCourier');
    const { order_id, created_at } = data;

    console.time('getTerminals');
    const terminals = await cacheControl.getTerminals();
    console.timeEnd('getTerminals');

    const order = await db
        .select({
            id: orders.id,
            order_status_id: orders.order_status_id,
            courier_id: orders.courier_id,
            terminal_id: orders.terminal_id,
            delivery_pricing_id: orders.delivery_pricing_id
        })
        .from(orders)
        .where(
            and(
                eq(orders.id, order_id),
                eq(orders.created_at, created_at)
            )
        )
        .execute();

    console.log('order', order);

    const organizationStatuses = await cacheControl.getOrderStatuses();

    const orderStatus = organizationStatuses.find(status => status.id === order[0].order_status_id);

    console.log('orderStatus', orderStatus);

    const deliveryPricing = await cacheControl.getDeliveryPricingById(order[0].delivery_pricing_id!);

    if (orderStatus!.sort <= 1 && !order[0].courier_id) {
        const nextCourier = await cacheControl.getNextQueueCourier(order[0].terminal_id, deliveryPricing!.drive_type);
        console.log('nextCourier', nextCourier);

        if (nextCourier) {
            await db.update(orders).set({
                courier_id: nextCourier
            })
                .where(eq(orders.id, order_id))
                .execute();
        }
    }

    console.log('organizationStatuses', organizationStatuses);
    console.timeEnd('processTryAssignCourier');

}
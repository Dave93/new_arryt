import { orders } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { CacheControlService } from "@api/src/modules/cache/service";
import { Queue } from "bullmq";
import { eq } from "drizzle-orm";

export default async function processFromBasketToCouriers(db: DB, cacheControl: CacheControlService, orderNotify: Queue, orderIndex: Queue, orderId: string) {
    const ordersList = await db.select({
        id: orders.id,
        courier_id: orders.courier_id,
        organization_id: orders.organization_id,
        terminal_id: orders.terminal_id,
        order_status_id: orders.order_status_id,
        order_number: orders.order_number,
    }).from(orders).where(eq(
        orders.id, orderId
    ));

    const order = ordersList[0];

    if (order && !order.courier_id) {
        const orderStatuses = await cacheControl.getOrderStatuses();

        const newStatus = orderStatuses.find(status => status.sort == 1 && status.organization_id == order.organization_id);

        await db.update(orders).set({
            order_status_id: newStatus!.id,
        }).where(eq(orders.id, order.id));


        await orderIndex.add(order.id, {
            id: order.id
        }, {
            attempts: 3, removeOnComplete: true
        });


        await orderNotify.add(order.id, order, {
            attempts: 3, removeOnComplete: true
        });
    }
}
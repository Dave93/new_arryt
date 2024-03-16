import { customers, order_status, orders, organization, terminals, users } from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { SearchService } from "@api/src/services/search/service";
import { eq, getTableColumns, and, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import dayjs from 'dayjs';

export default async function processOrderIndex(db: DB, searchService: SearchService, orderId: string, created_at: string) {
    const order = await db.select().from(orders).where(
        and(
            gte(orders.created_at, created_at),
            lte(orders.created_at, dayjs(created_at).add(6, 'hours').toISOString()),
            eq(orders.id, orderId)
        )
    ).execute();
    console.log('processOrderIndex', order);
    if (order && order.length > 0) {
        const orderData = order[0];
        // await searchService.indexOrder(orderData);
        await fetch(`${process.env.DUCK_API}/orders/index`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        })
    }
}
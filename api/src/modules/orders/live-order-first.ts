import dayjs from "dayjs";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { order_status, orders } from "../../../drizzle/schema";
import type { DB } from "../../lib/db";

/**
 * An order number is not unique: a cancelled order and the one created again under the same number can both exist
 * (the new delivery after a hold was called off and approved). A caller that picks one row by number left-joins
 * `order_status` on `orders.order_status_id` and orders by this, so the live row wins and the newest breaks a tie.
 */
export const liveOrderFirst = [
    sql`coalesce(${order_status.cancel}, false)`,
    desc(orders.created_at),
] as const;

/**
 * The live (not cancelled) order of this number, the duplicate a create has to refuse. Takes the database or a
 * transaction, so the create can repeat it under its advisory lock. The window is the one of the other lookups by
 * number in external/controler.ts: 35 days, no upper bound.
 */
export const findLiveOrderByNumber = (db: Pick<DB, "select">, organizationId: string, orderNumber: string) =>
    db
        .select({
            id: orders.id,
            cancelled: order_status.cancel,
        })
        .from(orders)
        .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
        .where(
            and(
                eq(orders.order_number, orderNumber),
                eq(orders.organization_id, organizationId),
                // A cancelled order of this number (a hold called its delivery off) is not a duplicate: the
                // same number is created again, and the other lookups by number take the live row first.
                sql`coalesce(${order_status.cancel}, false) = false`,
                gte(orders.created_at, dayjs().subtract(35, "day").toISOString()),
            ),
        )
        .limit(1)
        .execute();

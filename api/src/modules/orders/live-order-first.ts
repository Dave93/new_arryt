import { desc, sql } from "drizzle-orm";
import { order_status, orders } from "../../../drizzle/schema";

/**
 * An order number is not unique: a cancelled order and the one created again under the same number can both exist
 * (the new delivery after a hold was called off and approved). A caller that picks one row by number left-joins
 * `order_status` on `orders.order_status_id` and orders by this, so the live row wins and the newest breaks a tie.
 */
export const liveOrderFirst = [
    sql`coalesce(${order_status.cancel}, false)`,
    desc(orders.created_at),
] as const;

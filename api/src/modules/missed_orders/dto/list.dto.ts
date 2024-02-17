import { orders, order_status, terminals } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type MissedOrders = InferSelectModel<typeof orders> & {
    order_status: InferSelectModel<typeof order_status>;
    terminals: InferSelectModel<typeof terminals>;
};
import { customers, order_status, orders, organization, terminals, users } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type OrdersWithRelations = InferSelectModel<typeof orders> & {
    organization: InferSelectModel<typeof organization>;
    order_status: InferSelectModel<typeof order_status>;
    customers: InferSelectModel<typeof customers>;
    terminals: InferSelectModel<typeof terminals>;
    couriers: InferSelectModel<typeof users>;
    bonus: number
};
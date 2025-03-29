import { order_actions, orders, users } from "../../../../drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type OrderActionsWithRelations = InferSelectModel<typeof order_actions> & {
    orders: InferSelectModel<typeof orders>;
    users: InferSelectModel<typeof users>;
};
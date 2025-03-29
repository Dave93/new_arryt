import { order_status, organization } from "../../../../drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type OrderStatusWithRelations = InferSelectModel<typeof order_status> & {
    organization: InferSelectModel<typeof organization>;
};
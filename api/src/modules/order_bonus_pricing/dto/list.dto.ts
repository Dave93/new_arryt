import { order_bonus_pricing, organization, terminals } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type OrderBonusPricingWithRelations = InferSelectModel<typeof order_bonus_pricing> & {
    organization: InferSelectModel<typeof organization>;
    terminals: InferSelectModel<typeof terminals>;
};
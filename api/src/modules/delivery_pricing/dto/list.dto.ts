import { delivery_pricing, organization } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type DeliveryPricingWithRelations = InferSelectModel<typeof delivery_pricing> & {
    organization: InferSelectModel<typeof organization>;
};
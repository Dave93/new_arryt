import { constructed_bonus_pricing, organization } from "../../../../drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type ConstructedBonusPricingListWithRelations = InferSelectModel<typeof constructed_bonus_pricing> & {
    organization: InferSelectModel<typeof organization>;
};
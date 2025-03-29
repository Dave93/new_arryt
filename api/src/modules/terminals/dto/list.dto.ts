import { terminals, organization } from "../../../../drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type TerminalsWithRelations = InferSelectModel<typeof terminals> & {
    organization: InferSelectModel<typeof organization>;
};
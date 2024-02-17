import { terminals, organization } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type TerminalsWithRelations = InferSelectModel<typeof terminals> & {
    organization: InferSelectModel<typeof organization>;
};
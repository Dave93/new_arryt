import { api_tokens, organization } from "../../../../drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type ApiTokensWithRelations = InferSelectModel<typeof api_tokens> & {
    organization: InferSelectModel<typeof organization>;
};
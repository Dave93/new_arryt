import { work_schedules, organization } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export type WorkScheduleWithRelations = InferSelectModel<typeof work_schedules> & {
    organization: InferSelectModel<typeof organization>;
}
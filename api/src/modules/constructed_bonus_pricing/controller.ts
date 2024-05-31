import { constructed_bonus_pricing, organization } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SQLWrapper, and, asc, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { Elysia, t } from "elysia";
import { ConstructedBonusPricingListWithRelations } from "./dtos/list.dto";

export const constructedBonusPricingController = new Elysia({
    name: "@app/constructed_bonus_pricing",
})
    .use(ctx)
    .get(
        "/constructed_bonus_pricing",
        async ({ query: { limit, offset, sort, filters, fields }, drizzle, user, set, cacheControl }) => {
            if (!user) {
                set.status = 401;
                return {
                    message: "User not found",
                };
            }

            if (!user.access.additionalPermissions.includes("constructed_bonus_pricing.list")) {
                set.status = 401;
                return {
                    message: "You don't have permissions",
                };
            }
            let selectFields: SelectedFields = {};
            if (fields) {
                selectFields = parseSelectFields(fields, constructed_bonus_pricing, {
                    organization
                });
            }
            let whereClause: (SQLWrapper | undefined)[] = [];
            if (filters) {
                whereClause = parseFilterFields(filters, constructed_bonus_pricing, {
                    organization
                });
            }
            const constructedBonusPricingCount = await drizzle
                .select({ count: sql<number>`count(*)` })
                .from(constructed_bonus_pricing)
                .leftJoin(organization, eq(constructed_bonus_pricing.organization_id, organization.id))
                .where(and(...whereClause))
                .execute();
            const constructedBonusPricingList = await drizzle
                .select(selectFields)
                .from(constructed_bonus_pricing)
                .leftJoin(organization, eq(constructed_bonus_pricing.organization_id, organization.id))
                .where(and(...whereClause))
                .limit(+limit)
                .offset(+offset)
                .orderBy(asc(constructed_bonus_pricing.created_at))
                .execute() as ConstructedBonusPricingListWithRelations[];
            return {
                total: constructedBonusPricingCount[0].count,
                data: constructedBonusPricingList,
            };
        },
        {
            query: t.Object({
                limit: t.String(),
                offset: t.String(),
                sort: t.Optional(t.String()),
                filters: t.Optional(t.String()),
                fields: t.Optional(t.String()),
            })
        }
    )
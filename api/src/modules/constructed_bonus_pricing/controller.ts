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
            permission: 'constructed_bonus_pricing.list',
            query: t.Object({
                limit: t.String(),
                offset: t.String(),
                sort: t.Optional(t.String()),
                filters: t.Optional(t.String()),
                fields: t.Optional(t.String()),
            })
        }
    )
    .get('/constructed_bonus_pricing/:id', async ({ params: { id }, drizzle, user, set }) => {
        const permissionsRecord = await drizzle
            .select()
            .from(constructed_bonus_pricing)
            .where(eq(constructed_bonus_pricing.id, id))
            .execute();
        return {
            data: permissionsRecord[0],
        };
    }, {
        permission: 'constructed_bonus_pricing.show',
        params: t.Object({
            id: t.String(),
        }),
    })
    .post('/constructed_bonus_pricing', async ({ body: { data }, drizzle, cacheControl }) => {
        const result = await drizzle
            .insert(constructed_bonus_pricing)
            .values(data)
            .returning();
        await cacheControl.cacheConstructedBonusPricing();
        return {
            data: result[0],
        };
    }, {
        permission: 'constructed_bonus_pricing.create',
        body: t.Object({
            data: t.Object({
                name: t.String(),
                organization_id: t.String(),
                pricing: t.Array(t.Object({
                    rules: t.Array(
                        t.Object({
                            time_from: t.Number(),
                            time_to: t.Number(),
                            distance_from: t.Number(),
                            distance_to: t.Number(),
                            price: t.Number(),
                        })
                    ),
                }),
                ),
            }),
            fields: t.Optional(t.Array(t.String())),
        }),
    })
    .put('/constructed_bonus_pricing/:id', async ({ params: { id }, body: { data }, drizzle, cacheControl }) => {
        const result = await drizzle
            .update(constructed_bonus_pricing)
            .set(data)
            .where(eq(constructed_bonus_pricing.id, id))
            .returning();

        await cacheControl.cacheConstructedBonusPricing();
        return {
            data: result[0],
        };
    }, {
        permission: 'constructed_bonus_pricing.edit',
        params: t.Object({
            id: t.String(),
        }),
        body: t.Object({
            data: t.Object({
                name: t.String(),
                organization_id: t.String(),
                pricing: t.Array(t.Object({
                    rules: t.Array(
                        t.Object({
                            time_from: t.Number(),
                            time_to: t.Number(),
                            distance_from: t.Number(),
                            distance_to: t.Number(),
                            price: t.Number(),
                        })
                    ),
                }),
                ),
            }),
            fields: t.Optional(t.Array(t.String())),
        }),
    });
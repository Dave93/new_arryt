import { order_actions, users, orders } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { sql, eq, SQLWrapper, and, desc } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { Elysia, t } from "elysia";
import { OrderActionsWithRelations } from "./dto/list.dto";

export const OrderActionsController = new Elysia({
    name: "@app/order_actions",
})
    .use(ctx)
    .get(
        "/order_actions",
        async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
            let selectFields: SelectedFields = {};
            if (fields) {
                selectFields = parseSelectFields(fields, order_actions, {
                    users
                });
            }
            let whereClause: (SQLWrapper | undefined)[] = [];
            if (filters) {
                whereClause = parseFilterFields(filters, order_actions, {
                    users
                });
            }
            const orderActionsCount = await drizzle
                .select({ count: sql<number>`count(*)` })
                .from(order_actions)
                .leftJoin(orders, eq(order_actions.order_id, orders.id))
                .leftJoin(users, eq(order_actions.created_by, users.id))
                .where(and(...whereClause))
                .execute();
            const orderActionsList = await drizzle
                .select(selectFields)
                .from(order_actions)
                .leftJoin(orders, eq(order_actions.order_id, orders.id))
                .leftJoin(users, eq(order_actions.created_by, users.id))
                .where(and(...whereClause))
                .limit(+limit)
                .offset(+offset)
                .orderBy(desc(order_actions.created_at))
                .execute() as OrderActionsWithRelations[];
            return {
                total: orderActionsCount[0].count,
                data: orderActionsList,
            };
        },
        {
            permission: 'orders.edit',
            query: t.Object({
                limit: t.String(),
                offset: t.String(),
                sort: t.Optional(t.String()),
                filters: t.Optional(t.String()),
                fields: t.Optional(t.String()),
            }),
        }
    )
import { system_configs } from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
import { InferSelectModel, SQLWrapper, and, desc, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";

export const systemConfigsController = new Elysia({
    name: "@app/system_configs",
    prefix: "/api/system_configs",
})
    .use(contextWitUser)
    .get(
        "/",
        async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
            let selectFields: SelectedFields = {};
            if (fields) {
                selectFields = parseSelectFields(fields, system_configs, {});
            }
            let whereClause: (SQLWrapper | undefined)[] = [];
            if (filters) {
                whereClause = parseFilterFields(filters, system_configs, {});
            }
            const rolesCount = await drizzle
                .select({ count: sql<number>`count(*)` })
                .from(system_configs)
                .where(and(...whereClause))
                .execute();
            const rolesList = await drizzle
                .select(selectFields)
                .from(system_configs)
                .where(and(...whereClause))
                .limit(+limit)
                .offset(+offset)
                .orderBy(desc(system_configs.name))
                .execute() as InferSelectModel<typeof system_configs>[];
            return {
                total: rolesCount[0].count,
                data: rolesList,
            };
        },
        {
            permission: 'system_configs.list',
            query: t.Object({
                limit: t.String(),
                offset: t.String(),
                sort: t.Optional(t.String()),
                filters: t.Optional(t.String()),
                fields: t.Optional(t.String()),
            })
        }
    )
    .get("/cached", async ({ redis }) => {
        const res = await redis.get(
            `${process.env.PROJECT_PREFIX}_system_configs`
        );
        return JSON.parse(res || "{}") as Record<string, string>;
    }, {
        permission: 'system_configs.list',
    })
    .get(
        "/:id",
        async ({ params: { id }, drizzle }) => {
            const permissionsRecord = await drizzle
                .select()
                .from(system_configs)
                .where(eq(system_configs.id, id))
                .execute();
            return {
                data: permissionsRecord[0],
            };
        },
        {
            permission: 'system_configs.list',
            params: t.Object({
                id: t.String(),
            }),
        }
    )
    .post(
        "/",
        async ({ body: { data, fields }, drizzle, cacheControl }) => {
            let selectFields = {};
            if (fields) {
                selectFields = parseSelectFields(fields, system_configs, {});
            }
            const result = await drizzle
                .insert(system_configs)
                .values(data)
                .returning(selectFields);
            await cacheControl.cacheSystemConfigs();
            return {
                data: result[0],
            };
        },
        {
            permission: 'system_configs.list',
            body: t.Object({
                data: t.Object({
                    name: t.String(),
                    value: t.String(),
                }),
                fields: t.Optional(t.Array(t.String())),
            }),
        }
    )
    .post('/set_multiple', async ({ body: { data }, cacheControl, drizzle }) => {

        await drizzle.transaction(async (transaction) => {
            for (const item of data) {
                await transaction.insert(system_configs).values(item).onConflictDoUpdate({
                    target: system_configs.name,
                    set: {
                        value: item.value
                    }
                });
            }
        });

        await cacheControl.cacheSystemConfigs();
        return {

        };
    }, {
        permission: 'system_configs.list',
        body: t.Object({
            data: t.Array(t.Object({
                name: t.String(),
                value: t.String(),
            })),
        }),
    })
    .put(
        "/:id",
        async ({ params: { id }, body: { data, fields }, drizzle, cacheControl }) => {
            let selectFields = {};
            if (fields) {
                selectFields = parseSelectFields(fields, system_configs, {});
            }
            const result = await drizzle
                .update(system_configs)
                .set(data)
                .where(eq(system_configs.id, id))
                .returning(selectFields);
            await cacheControl.cacheSystemConfigs();
            return {
                data: result[0],
            };
        },
        {
            permission: 'system_configs.list',
            params: t.Object({
                id: t.String(),
            }),
            body: t.Object({
                data: t.Object({
                    name: t.String(),
                    value: t.String(),
                }),
                fields: t.Optional(t.Array(t.String())),
            }),
        }
    )
    .delete(
        "/:id",
        async ({ params: { id }, drizzle, cacheControl }) => {
            const result = await drizzle
                .delete(system_configs)
                .where(eq(system_configs.id, id))
                .returning();
            await cacheControl.cacheSystemConfigs();
            return {
                data: result[0],
            };
        },
        {
            permission: 'system_configs.list',
            params: t.Object({
                id: t.String(),
            }),
        }
    ) 
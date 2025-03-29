import { permissions } from "../../../drizzle/schema";
import { InferSelectModel, SQLWrapper, eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { parseSelectFields } from "../../lib/parseSelectFields";
import { SelectedFields } from "drizzle-orm/pg-core";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";

export const PermissionsController = new Elysia({
  name: "@app/permissions",
  prefix: "/api/permissions",
})
  .use(contextWitUser)
  .get(
    "/",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, permissions, {});
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, permissions, {});
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(permissions)
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(permissions)
        .limit(+limit)
        .offset(+offset)
        .execute();
      return {
        total: rolesCount[0].count,
        data: rolesList,
      };
    },
    {
      permission: 'permissions.list',
      query: t.Object({
        limit: t.String(),
        offset: t.String(),
        sort: t.Optional(t.String()),
        filters: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .get("/cached", async ({ redis }) => {
    const res = await redis.get(`${process.env.PROJECT_PREFIX}_permissions`);
    return JSON.parse(res || "[]") as InferSelectModel<typeof permissions>[];
  }, {
    permission: 'permissions.list',
  })
  .get(
    "/:id",
    async ({ params: { id }, drizzle }) => {
      const permissionsRecord = await drizzle
        .select()
        .from(permissions)
        .where(eq(permissions.id, id))
        .execute();
      return {
        data: permissionsRecord[0],
      };
    },
    {
      permission: 'permissions.show',
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ body: { data, fields }, drizzle }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, permissions, {});
      }
      const result = await drizzle
        .insert(permissions)
        .values(data)
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'permissions.create',
      body: t.Object({
        data: t.Object({
          slug: t.String(),
          description: t.String(),
          active: t.Optional(t.Boolean()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body: { data, fields }, drizzle }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, permissions, {});
      }
      const result = await drizzle
        .update(permissions)
        .set(data)
        .where(eq(permissions.id, id))
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'permissions.edit',
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        data: t.Object({
          slug: t.String(),
          description: t.String(),
          active: t.Optional(t.Boolean()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
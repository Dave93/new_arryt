import { permissions, roles, roles_permissions } from "../../../drizzle/schema";
import { InferSelectModel, SQLWrapper, eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { parseSelectFields } from "../../lib/parseSelectFields";
import { SelectedFields } from "drizzle-orm/pg-core";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";

export const RolesController = new Elysia({
  name: "@app/roles",
  prefix: "/api/roles",
})
  .use(contextWitUser)
  .get(
    "/",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, roles, {});
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, roles, {});
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(roles)
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(roles)
        .limit(+limit)
        .offset(+offset)
        .execute();
      return {
        total: rolesCount[0].count,
        data: rolesList,
      };
    },
    {
      permission: 'roles.list',
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
    const res = await redis.get(`${process.env.PROJECT_PREFIX}_roles`);
    return JSON.parse(res || "[]") as InferSelectModel<typeof roles>[];
  }, {
    permission: 'roles.list',
  })
  .get('/:id/permissions', async ({ params: { id }, drizzle }) => {
    const permissionsList = await drizzle
      .select({
        permission_id: roles_permissions.permission_id,
        permission_slug: permissions.slug,
        permission_description: permissions.description,
      })
      .from(roles_permissions)
      .leftJoin(permissions, eq(roles_permissions.permission_id, permissions.id))
      .where(eq(roles_permissions.role_id, id))
      .execute();
    return {
      data: permissionsList,
    };
  }, {
    permission: 'roles.show',
    params: t.Object({
      id: t.String(),
    }),
  })
  .get(
    "/:id",
    async ({ params: { id }, drizzle }) => {
      const rolesRecord = await drizzle
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .execute();
      return {
        data: rolesRecord[0],
      };
    },
    {
      permission: 'roles.show',
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
        selectFields = parseSelectFields(fields, roles, {});
      }
      const result = await drizzle
        .insert(roles)
        .values(data)
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'roles.create',
      body: t.Object({
        data: t.Object({
          name: t.String(),
          code: t.String(),
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
        selectFields = parseSelectFields(fields, roles, {});
      }
      const result = await drizzle
        .update(roles)
        .set(data)
        .where(eq(roles.id, id))
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'roles.edit',
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        data: t.Object({
          name: t.String(),
          code: t.String(),
          active: t.Optional(t.Boolean()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
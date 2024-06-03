import { roles, roles_permissions } from "@api/drizzle/schema";
import { InferSelectModel, eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SelectedFields } from "drizzle-orm/pg-core";
import { ctx } from "@api/src/context";

export const RolesController = new Elysia({
  name: "@app/roles",
})
  .use(ctx)
  .get(
    "/roles",
    async ({ query: { limit, offset, sort, filter, fields }, drizzle, set, user }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("roles.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, roles, {});
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
      query: t.Object({
        limit: t.String(),
        offset: t.String(),
        sort: t.Optional(t.String()),
        filter: t.Optional(
          t.Object({
            id: t.Number(),
            name: t.String(),
            email: t.String(),
            address: t.String(),
            phone: t.String(),
          })
        ),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .get("/roles/cached", async ({ redis, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("roles.list")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }
    const res = await redis.get(`${process.env.PROJECT_PREFIX}_roles`);
    return JSON.parse(res || "[]") as InferSelectModel<typeof roles>[];
  })
  .get('/roles/:id/permissions', async ({ params: { id }, drizzle, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("roles.show")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }
    const permissionsList = await drizzle
      .select({
        permission_id: roles_permissions.permission_id,
      })
      .from(roles_permissions)
      .where(eq(roles_permissions.role_id, id))
      .execute();
    return {
      data: permissionsList,
    };
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })
  .get(
    "/roles/:id",
    async ({ params: { id }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("roles.show")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/roles",
    async ({ body: { data, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("roles.create")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
    "/roles/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("roles.edit")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
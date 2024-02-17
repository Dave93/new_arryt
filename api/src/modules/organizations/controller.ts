import { organization } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { InferSelectModel, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";

export const OrganizationsController = new Elysia({
  name: '@app/organizations',
})
  .use(ctx)
  .get(
    "/organization",
    async ({ query: { limit, offset, sort, filter, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("organization.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, organization, {});
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(organization)
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(organization)
        .limit(+limit)
        .offset(+offset)
        .execute() as InferSelectModel<typeof organization>[];
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
  .get("/organizations/cached", async ({ redis, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("organization.list")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }
    const res = await redis.get(
      `${process.env.PROJECT_PREFIX}_organizations`
    );
    return JSON.parse(res || "[]") as InferSelectModel<typeof organization>[];
  })
  .get(
    "/organization/:id",
    async ({ params: { id }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("organization.show")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      const permissionsRecord = await drizzle
        .select()
        .from(organization)
        .where(eq(organization.id, id))
        .execute();
      return {
        data: permissionsRecord[0],
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/organization",
    async ({ body: { data, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("organization.create")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, organization, {});
      }
      const result = await drizzle
        .insert(organization)
        .values(data)
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      body: t.Object({
        data: createInsertSchema(organization) as any,
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/organization/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("organization.edit")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, organization, {});
      }
      const result = await drizzle
        .update(organization)
        .set(data)
        .where(eq(organization.id, id))
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
        data: createInsertSchema(organization) as any,
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )


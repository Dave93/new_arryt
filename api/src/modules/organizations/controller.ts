import { organization } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { InferSelectModel, SQLWrapper, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";

export const OrganizationsController = new Elysia({
  name: '@app/organizations',
})
  .use(ctx)
  .get(
    "/organization",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle, user, set }) => {
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
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, organization, {});
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
        filters: t.Optional(t.String()),
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
        data: t.Object({
          name: t.String(),
          description: t.String(),
          active: t.Boolean(),
          system_type: t.Union([t.Literal("jowi"), t.Literal("r_keeper"), t.Literal("iiko")]),
          phone: t.String(),
          iiko_login: t.Optional(t.String()),
          webhook: t.Optional(t.String()),
          group_id: t.Optional(t.String()),
          apelsin_login: t.Optional(t.String()),
          apelsin_password: t.Optional(t.String()),
          sender_name: t.Optional(t.String()),
          sender_number: t.Optional(t.String()),
          max_distance: t.Optional(t.Number()),
          max_active_order_count: t.Optional(t.Number()),
          max_order_close_distance: t.Optional(t.Number()),
          payment_type: t.Union([t.Literal("cash"), t.Literal("card"), t.Literal("client")]),
          support_chat_url: t.Optional(t.String()),
          icon_url: t.Optional(t.String()),
          allow_yandex_delivery: t.Optional(t.Boolean())
        }),
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
        data: t.Object({
          name: t.String(),
          description: t.String(),
          active: t.Boolean(),
          system_type: t.Union([t.Literal("jowi"), t.Literal("r_keeper"), t.Literal("iiko")]),
          phone: t.String(),
          iiko_login: t.Optional(t.String()),
          webhook: t.Optional(t.String()),
          group_id: t.Optional(t.String()),
          apelsin_login: t.Optional(t.String()),
          apelsin_password: t.Optional(t.String()),
          sender_name: t.Optional(t.String()),
          sender_number: t.Optional(t.String()),
          max_distance: t.Optional(t.Number()),
          max_active_order_count: t.Optional(t.Number()),
          max_order_close_distance: t.Optional(t.Number()),
          payment_type: t.Union([t.Literal("cash"), t.Literal("card"), t.Literal("client")]),
          support_chat_url: t.Optional(t.String()),
          icon_url: t.Optional(t.String()),
          allow_yandex_delivery: t.Optional(t.Boolean())
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )


import { organization } from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
import { InferSelectModel, SQLWrapper, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";

export const OrganizationsController = new Elysia({
  name: '@app/organizations'
})
  .use(contextWitUser)
  .get(
    "/api/organization/",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
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
      permission: 'organization.list',
      query: t.Object({
        limit: t.String(),
        offset: t.String(),
        sort: t.Optional(t.String()),
        filters: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .get("/api/organizations/cached", async ({ redis }) => {
    const res = await redis.get(
      `${process.env.PROJECT_PREFIX}_organizations`
    );
    return JSON.parse(res || "[]") as InferSelectModel<typeof organization>[];
  }, {
    permission: 'organization.list',
  })
  .get(
    "/api/organization/:id",
    async ({ params: { id }, drizzle }) => {
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
      permission: 'organization.show',
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/api/organization/",
    async ({ body: { data, fields }, drizzle }) => {
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
      permission: 'organization.create',
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
    "/api/organization/:id",
    async ({ params: { id }, body: { data, fields }, drizzle }) => {
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
      permission: 'organization.edit',
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


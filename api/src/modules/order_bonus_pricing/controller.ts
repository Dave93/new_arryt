import {
  order_bonus_pricing,
  organization, terminals
} from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
import { InferSelectModel, SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { OrderBonusPricingWithRelations } from "./dto/list.dto";

export const OrderBonusPricingController = new Elysia({
  name: "@app/order_bonus_pricing",
  prefix: "/api/order_bonus_pricing",
})
  .use(contextWitUser)
  .get(
    "/",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, order_bonus_pricing, {
          organization,
          terminals,
        });
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, order_bonus_pricing, {
          organization,
          terminals,
        });
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(order_bonus_pricing)
        .where(and(...whereClause))
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(order_bonus_pricing)
        .leftJoin(
          organization,
          eq(order_bonus_pricing.organization_id, organization.id)
        )
        .leftJoin(
          terminals,
          eq(order_bonus_pricing.terminal_id, terminals.id)
        )
        .where(and(...whereClause))
        .limit(+limit)
        .offset(+offset)
        .execute() as OrderBonusPricingWithRelations[];
      return {
        total: rolesCount[0].count,
        data: rolesList,
      };
    },
    {
      permission: 'order_bonus_pricing.list',
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
    const res = await redis.get(
      `${process.env.PROJECT_PREFIX}_order_bonus_pricing`
    );
    return JSON.parse(res || "[]") as InferSelectModel<typeof order_bonus_pricing>[];
  }, {
    permission: 'order_bonus_pricing.list',
  })
  .get(
    "/:id",
    async ({ params: { id }, drizzle }) => {
      const permissionsRecord = await drizzle
        .select()
        .from(order_bonus_pricing)
        .where(eq(order_bonus_pricing.id, id))
        .execute();
      return {
        data: permissionsRecord[0],
      };
    },
    {
      permission: 'order_bonus_pricing.show',
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
        selectFields = parseSelectFields(fields, order_bonus_pricing, {});
      }
      const result = await drizzle
        .insert(order_bonus_pricing)
        .values(data)
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'order_bonus_pricing.create',
      body: t.Object({
        data: t.Object({
          active: t.Optional(t.Boolean()),
          name: t.String(),
          max_order_time: t.Optional(t.Number()),
          rules: t.Array(t.Object({})),
          max_distance_km: t.Optional(t.Number()),
          organization_id: t.String(),
          terminal_id: t.String(),
          terminal_ids: t.Optional(t.Array(t.String())),
          courier_id: t.Optional(t.String()),
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
        selectFields = parseSelectFields(fields, order_bonus_pricing, {});
      }
      const result = await drizzle
        .update(order_bonus_pricing)
        .set(data)
        .where(eq(order_bonus_pricing.id, id))
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'order_bonus_pricing.edit',
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        data: t.Object({
          active: t.Optional(t.Boolean()),
          name: t.String(),
          max_order_time: t.Optional(t.Number()),
          rules: t.Array(t.Object({})),
          max_distance_km: t.Optional(t.Number()),
          organization_id: t.String(),
          terminal_id: t.String(),
          terminal_ids: t.Optional(t.Array(t.String())),
          courier_id: t.Optional(t.String()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
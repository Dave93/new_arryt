import {
  api_tokens,
  daily_garant,
  delivery_pricing,
  order_bonus_pricing,
  organization,
  organization_system_type,
  terminals,
  work_schedules,
} from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { db } from "@api/src/lib/db";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { InferSelectModel, SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import Redis from "ioredis";

export const OrderBonusPricingController = new Elysia({
  name: "@app/order_bonus_pricing",
})
  .use(ctx)
  .get(
    "/order_bonus_pricing",
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
        filters: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .get("/order_bonus_pricing/cached", async ({ redis }) => {
    const res = await redis.get(
      `${process.env.PROJECT_PREFIX}_order_bonus_pricing`
    );
    return JSON.parse(res || "[]") as InferSelectModel<typeof order_bonus_pricing>[];
  })
  .get(
    "/order_bonus_pricing/:id",
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
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/order_bonus_pricing",
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
      body: t.Object({
        data: createInsertSchema(order_bonus_pricing) as any,
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/order_bonus_pricing/:id",
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
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        data: createInsertSchema(order_bonus_pricing) as any,
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
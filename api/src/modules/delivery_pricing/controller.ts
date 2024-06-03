import {
  delivery_pricing,
  organization,
} from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import dayjs from "dayjs";
import { InferSelectModel, SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { DeliveryPricingWithRelations } from "./dto/list.dto";

export const DeliveryPricingController = new Elysia({
  name: "@app/delivery_pricing",
})
  .use(ctx)
  .get(
    "/delivery_pricing",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("delivery_pricing.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, delivery_pricing, {
          organization,
        });
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, delivery_pricing, {
          organization,
        });
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(delivery_pricing)
        .where(and(...whereClause))
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(delivery_pricing)
        .leftJoin(
          organization,
          eq(delivery_pricing.organization_id, organization.id)
        )
        .where(and(...whereClause))
        .limit(+limit)
        .offset(+offset)
        .execute() as DeliveryPricingWithRelations[];
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
  .get("/delivery_pricing/cached", async ({ redis, user, set }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("delivery_pricing.list")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }
    const res = await redis.get(
      `${process.env.PROJECT_PREFIX}_delivery_pricing`
    );
    return JSON.parse(res || "[]") as InferSelectModel<typeof delivery_pricing>[];
  })
  .get(
    "/delivery_pricing/:id",
    async ({ params: { id }, drizzle, set, user }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("delivery_pricing.show")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      const permissionsRecord = await drizzle
        .select()
        .from(delivery_pricing)
        .where(eq(delivery_pricing.id, id))
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
    "/delivery_pricing",
    async ({ body: { data, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("delivery_pricing.create")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, delivery_pricing, {});
      }
      const result = await drizzle
        .insert(delivery_pricing)
        .values(data)
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      body: t.Object({
        data: t.Object({
          active: t.Boolean(),
          default: t.Boolean(),
          name: t.String(),
          drive_type: t.Union([t.Literal("bycicle"), t.Literal("foot"), t.Literal("bike"), t.Literal("car")]),
          days: t.Array(t.String()),
          start_time: t.String(),
          end_time: t.String(),
          min_price: t.Number(),
          rules: t.Array(t.Object({
            from: t.Number(),
            price: t.Number(),
            to: t.Number(),
          })),
          price_per_km: t.Number(),
          customer_rules: t.Array(t.Object({
            from: t.Number(),
            price: t.Number(),
            to: t.Number(),
          })),
          customer_price_per_km: t.Number(),
          min_distance_km: t.Number(),
          organization_id: t.String(),
          terminal_id: t.String(),
          payment_type: t.Union([t.Literal("client"), t.Literal("card"), t.Literal("cash")]),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/delivery_pricing/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, set, user }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("delivery_pricing.edit")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, delivery_pricing, {});
      }

      if (data.start_time) {
        data.start_time = dayjs(data.start_time).format("HH:mm:ss");
      }

      if (data.end_time) {
        data.end_time = dayjs(data.end_time).format("HH:mm:ss");
      }

      const result = await drizzle
        .update(delivery_pricing)
        .set(data)
        .where(eq(delivery_pricing.id, id))
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
          active: t.Boolean(),
          default: t.Boolean(),
          name: t.String(),
          drive_type: t.Union([t.Literal("bycicle"), t.Literal("foot"), t.Literal("bike"), t.Literal("car")]),
          days: t.Array(t.String()),
          start_time: t.String(),
          end_time: t.String(),
          min_price: t.Number(),
          rules: t.Array(t.Object({
            from: t.Number(),
            price: t.Number(),
            to: t.Number(),
          })),
          price_per_km: t.Number(),
          customer_rules: t.Array(t.Object({
            from: t.Number(),
            price: t.Number(),
            to: t.Number(),
          })),
          customer_price_per_km: t.Number(),
          min_distance_km: t.Number(),
          organization_id: t.String(),
          terminal_id: t.String(),
          payment_type: t.Union([t.Literal("client"), t.Literal("card"), t.Literal("cash")]),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )

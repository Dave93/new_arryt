import {
  delivery_pricing,
  organization,
} from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import dayjs from "dayjs";
import { InferSelectModel, SQLWrapper, and, eq, sql, asc } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { DeliveryPricingWithRelations } from "./dto/list.dto";

export const DeliveryPricingController = new Elysia({
  name: "@app/delivery_pricing",
})
  .use(ctx)
  .get(
    "/delivery_pricing",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
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
        .orderBy(asc(delivery_pricing.name))
        .execute() as DeliveryPricingWithRelations[];
      return {
        total: rolesCount[0].count,
        data: rolesList,
      };
    },
    {
      permission: 'delivery_pricing.list',
      query: t.Object({
        limit: t.String(),
        offset: t.String(),
        sort: t.Optional(t.String()),
        filters: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .get("/delivery_pricing/cached", async ({ redis }) => {
    const res = await redis.get(
      `${process.env.PROJECT_PREFIX}_delivery_pricing`
    );
    return JSON.parse(res || "[]") as InferSelectModel<typeof delivery_pricing>[];
  }, {
    permission: 'delivery_pricing.list',
  })
  .get(
    "/delivery_pricing/:id",
    async ({ params: { id }, drizzle }) => {
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
      permission: 'delivery_pricing.show',
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/delivery_pricing",
    async ({ body: { data, fields }, drizzle }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, delivery_pricing, {});
      }

      if (data.start_time && data.start_time.length > 8) {
        console.log('data.start_time', data.start_time);
        try {
          data.start_time = dayjs(data.start_time).format("HH:mm:ss");
        } catch (e) {
          console.log('data.start_time', data.start_time);
        }
      }

      if (data.end_time && data.end_time.length > 8) {
        try {
          data.end_time = dayjs(data.end_time).format("HH:mm:ss");
        } catch (e) {
          console.log('data.end_time', data.end_time);
        }
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
      permission: 'delivery_pricing.create',
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
          customer_rules: t.Optional(t.Array(t.Object({
            from: t.Number(),
            price: t.Number(),
            to: t.Number(),
          }))),
          customer_price_per_km: t.Optional(t.Number()),
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
    async ({ params: { id }, body: { data, fields }, drizzle, cacheControl }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, delivery_pricing, {});
      }

      if (data.start_time && data.start_time.length > 8) {
        console.log('data.start_time', data.start_time);
        try {
          data.start_time = dayjs(data.start_time).format("HH:mm:ss");
        } catch (e) {
          console.log('data.start_time', data.start_time);
        }
      }

      if (data.end_time && data.end_time.length > 8) {
        try {
          data.end_time = dayjs(data.end_time).format("HH:mm:ss");
        } catch (e) {
          console.log('data.end_time', data.end_time);
        }
      }

      const result = await drizzle
        .update(delivery_pricing)
        .set(data)
        .where(eq(delivery_pricing.id, id))
        .returning({
          id: delivery_pricing.id,
        });

      await cacheControl.cacheDeliveryPricing();

      return {
        data: result[0],
      };
    },
    {
      permission: 'delivery_pricing.edit',
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
          terminal_id: t.Optional(t.Nullable(t.String())),
          payment_type: t.Union([t.Literal("client"), t.Literal("card"), t.Literal("cash")]),
          source_type: t.Optional(t.String()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )

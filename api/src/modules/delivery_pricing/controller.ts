import {
  delivery_pricing,
  organization,
  organization_system_type,
  terminals,
} from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import dayjs from "dayjs";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import Redis from "ioredis";

export const DeliveryPricingController = (
  app: Elysia<
    "",
    {
      store: {
        redis: Redis;
      };
      bearer: string;
      request: {};
      schema: {};
    }
  >
) =>
  app
    .get(
      "/api/delivery_pricing",
      async ({ query: { limit, offset, sort, filters, fields } }) => {
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
        const rolesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(delivery_pricing)
          .where(and(...whereClause))
          .execute();
        const rolesList = await db
          .select(selectFields)
          .from(delivery_pricing)
          .leftJoin(
            organization,
            eq(delivery_pricing.organization_id, organization.id)
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
    .get("/api/delivery_pricing/cached", async ({ store: { redis } }) => {
      const res = await redis.get(
        `${process.env.PROJECT_PREFIX}_delivery_pricing`
      );
      return JSON.parse(res || "[]");
    })
    .get(
      "/api/delivery_pricing/:id",
      async ({ params: { id } }) => {
        const permissionsRecord = await db
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
      "/api/delivery_pricing",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, delivery_pricing, {});
        }
        const result = await db
          .insert(delivery_pricing)
          .values(data)
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        body: t.Object({
          data: createInsertSchema(delivery_pricing) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/delivery_pricing/:id",
      async ({ params: { id }, body: { data, fields } }) => {
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

        const result = await db
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
          data: createInsertSchema(delivery_pricing) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );

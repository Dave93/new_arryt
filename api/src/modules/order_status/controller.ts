import { customers, order_status, organization } from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { eq, sql, getTableColumns, SelectedFieldsFlat } from "drizzle-orm";
import Elysia, { t } from "elysia";
import Redis from "ioredis";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { PgColumn, SelectedFields } from "drizzle-orm/pg-core";

export const OrderStatusController = (
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
      "/api/order_status",
      async ({ query: { limit, offset, sort, filter, fields } }) => {
        let selectFields: SelectedFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, order_status, {
            organization,
          });
        }
        const orderStatusCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(order_status)
          .execute();
        const orderStatusList = await db
          .select(selectFields)
          .from(order_status)
          .leftJoin(
            organization,
            eq(order_status.organization_id, organization.id)
          )
          .limit(+limit)
          .offset(+offset)
          .execute();
        return {
          total: orderStatusCount[0].count,
          data: orderStatusList,
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
    .get(
      "/api/order_status/cached",
      async ({ store: { redis }, query: { organization_id } }) => {
        const res = await redis.get(
          `${process.env.PROJECT_PREFIX}_order_status`
        );
        let result = JSON.parse(res || "[]");
        if (organization_id) {
          result = result.filter(
            (orderStatus: any) =>
              orderStatus.organization_id === organization_id
          );
        }
        return result;
      },
      {
        query: t.Object({
          organization_id: t.Optional(t.String()),
        }),
      }
    )
    .get(
      "/api/order_status/:id",
      async ({ params: { id } }) => {
        const orderStatus = await db
          .select()
          .from(order_status)
          .where(eq(order_status.id, id))
          .execute();
        return {
          data: orderStatus[0],
        };
      },
      {
        params: t.Object({
          id: t.String(),
        }),
      }
    )
    .post(
      "/api/order_status",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, order_status, {
            organization,
          });
        }
        const result = await db
          .insert(order_status)
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
            sort: t.Number(),
            color: t.String(),
            finish: t.Optional(t.Boolean()),
            cancel: t.Optional(t.Boolean()),
            waiting: t.Optional(t.Boolean()),
            need_location: t.Optional(t.Boolean()),
            on_way: t.Optional(t.Boolean()),
            in_terminal: t.Optional(t.Boolean()),
            should_pay: t.Optional(t.Boolean()),
            yandex_delivery_statuses: t.Optional(t.String()),
            organization_id: t.String(),
          }),
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/order_status/:id",
      async ({ params: { id }, body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, order_status, {
            organization,
          });
        }
        const result = await db
          .update(order_status)
          .set(data)
          .where(eq(order_status.id, id))
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
            sort: t.Number(),
            color: t.String(),
            finish: t.Optional(t.Boolean()),
            cancel: t.Optional(t.Boolean()),
            waiting: t.Optional(t.Boolean()),
            need_location: t.Optional(t.Boolean()),
            on_way: t.Optional(t.Boolean()),
            in_terminal: t.Optional(t.Boolean()),
            should_pay: t.Optional(t.Boolean()),
            yandex_delivery_statuses: t.Optional(t.String()),
            organization_id: t.Optional(t.String()),
          }),
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );

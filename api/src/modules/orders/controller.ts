import {
  customers,
  order_status,
  orders,
  organization,
  terminals,
  users,
} from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { checkRestPermission } from "@api/src/utils/check_rest_permissions";
import dayjs from "dayjs";
import { SQLWrapper, and, desc, eq, sql } from "drizzle-orm";
import { SelectedFields, alias } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import Redis from "ioredis";
import { GarantReportItem } from "./dtos/reposts.dto";

export const OrdersController = (
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
    .decorate("permission", "orders.list")
    .get(
      "/api/orders",
      async ({ query: { limit, offset, sort, filters, fields } }) => {
        const couriers = alias(users, "couriers");
        let selectFields: SelectedFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, orders, {
            organization,
            order_status,
            customers,
            terminals,
            couriers,
          });
        }
        let whereClause: (SQLWrapper | undefined)[] = [];
        if (filters) {
          whereClause = parseFilterFields(filters, orders, {
            organization,
            order_status,
            customers,
            terminals,
            couriers,
          });
        }
        const rolesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .leftJoin(organization, eq(orders.organization_id, organization.id))
          .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
          .leftJoin(couriers, eq(orders.courier_id, couriers.id))
          .where(and(...whereClause))
          .execute();
        const rolesList = await db
          .select(selectFields)
          .from(orders)
          .leftJoin(organization, eq(orders.organization_id, organization.id))
          .leftJoin(order_status, eq(orders.order_status_id, order_status.id))
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .leftJoin(terminals, eq(orders.terminal_id, terminals.id))
          .leftJoin(couriers, eq(orders.courier_id, couriers.id))
          .where(and(...whereClause))
          .limit(+limit)
          .offset(+offset)
          .orderBy(desc(orders.created_at))
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
        beforeHandle: checkRestPermission,
      }
    )
    .post(
      "/api/orders/calculate_garant",
      async ({
        store: { redis },
        body: {
          data: {
            startDate,
            endDate,
            courierId,
            filteredTerminalIds,
            walletEndDate,
          },
        },
      }) => {
        const sqlStartDate = dayjs(startDate.split("T")[0])
          .add(1, "d")
          .subtract(5, "hour")
          .hour(0)
          .minute(0)
          .second(0)
          .format("YYYY-MM-DD HH:mm:ss");
        let sqlEndDate = dayjs(endDate.split("T")[0])
          .add(1, "day")
          .hour(4)
          .minute(0)
          .second(0)
          .format("YYYY-MM-DD HH:mm:ss");

        console.log("sqlStartDate", sqlStartDate);
        console.log("sqlEndDate", sqlEndDate);
        const sqlWalletEndDate = walletEndDate
          ? dayjs(walletEndDate.toISOString().split("T")[0])
              .add(2, "day")
              .toISOString()
              .split("T")[0]
          : null;
        const sqlPrevStartDate = dayjs(sqlStartDate)
          .subtract(1, "month")
          .toISOString()
          .split("T")[0];
        const sqlPrevEndDate = dayjs(sqlEndDate)
          .subtract(1, "month")
          .toISOString()
          .split("T")[0];
        if (dayjs(sqlStartDate).isSame(dayjs(), "month")) {
          sqlEndDate = dayjs()
            .hour(5)
            .minute(0)
            .second(0)
            .toISOString()
            .split("T")[0];
        }

        const res = await redis.get(
          `${process.env.PROJECT_PREFIX}_organizations`
        );
        let organizations = JSON.parse(res || "[]");
        const terminalsRes = await redis.get(
          `${process.env.PROJECT_PREFIX}_terminals`
        );
        let terminals = JSON.parse(terminalsRes || "[]");

        const prevMonthOrders = await db.execute(
          sql.raw(`select
       o.courier_id,
       count(o.courier_id) as total_orders
     from orders o
            inner join order_status os on o.order_status_id = os.id and os.finish = true
            inner join users u on o.courier_id = u.id
     where o.created_at >= '${sqlPrevStartDate} 00:00:00' and o.created_at <= '${sqlPrevEndDate} 04:00:00'  ${
            courierId
              ? `and o.courier_id in (${courierId
                  .map((id) => `'${id}'`)
                  .join(",")})`
              : ""
          }
     group by o.courier_id
     order by o.courier_id;`)
        );
        console.time("garantQuery");

        let query = await db.execute(
          sql.raw(`select
            min(o.created_at) as begin_date,
            max(o.created_at) as last_order_date,
            sum(o.delivery_price) as delivery_price,
            concat(u.first_name, ' ', u.last_name) as courier,
            count(o.id) as orders_count,
            AVG(EXTRACT(EPOCH FROM (o.finished_date - o.created_at)) / 60) as avg_delivery_time,
            array_agg(date_trunc('day', o.created_at)) as orders_dates,
            o.courier_id
        from orders o
                 left join order_status os on o.order_status_id = os.id
                 left join users u on o.courier_id = u.id
        where o.created_at >= '${sqlStartDate}' and o.created_at <= '${sqlEndDate}' and os.finish = true ${
            courierId
              ? `and o.courier_id in (${courierId
                  .map((id) => `'${id}'`)
                  .join(",")})`
              : ""
          }
        group by o.courier_id, u.first_name, u.last_name
        order by courier;`)
        );

        console.timeEnd("garantQuery");
        return {
          davr: "test",
        };
      },
      {
        body: t.Object({
          data: t.Object({
            startDate: t.String(),
            endDate: t.String(),
            courierId: t.Optional(t.Array(t.String())),
            filteredTerminalIds: t.Optional(t.Array(t.String())),
            walletEndDate: t.Optional(t.Date()),
          }),
        }),
      }
    )
    .get(
      "/api/orders/:id",
      async ({ params: { id } }) => {
        const permissionsRecord = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id))
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
      "/api/orders",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, orders, {});
        }
        const result = await db
          .insert(orders)
          .values(data)
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        body: t.Object({
          data: createInsertSchema(orders) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/orders/:id",
      async ({ params: { id }, body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, orders, {});
        }
        const result = await db
          .update(orders)
          .set(data)
          .where(eq(orders.id, id))
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
          data: createInsertSchema(orders) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );

const dotenv = require("dotenv");
import { LogicalReplicationService, PgoutputPlugin, Pgoutput } from 'pg-logical-replication'
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import dayjs = require("dayjs");
import { Database } from "duckdb-async";
import { Hono } from "hono";
import { z } from "zod";
import { Client } from 'pg'
import { uniq } from "lodash";
import { loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js'
import { syncDuck } from "./sync_duck";
import path = require('path');
import { loadSync } from '@grpc/proto-loader';
import Elysia, { t } from 'elysia';
// import transactionsProto from '@protos/arryt.proto'


dotenv.config();

const tableByChunk: {
  [key: string]: string;
} = {};

const getTableNamesByChunk = async () => {
  const client = new Client({
    user: process.env.PG_DB_USER,
    password: process.env.PG_DB_PASSWORD,
    host: process.env.PG_DB_HOST,
    port: +process.env.PG_DB_PORT!,
    database: process.env.PG_DB_NAME,
  })
  await client.connect()

  const res = await client.query('select hypertable_name,chunk_name FROM timescaledb_information.chunks;')
  res.rows.forEach((row) => {
    tableByChunk[row.chunk_name] = row.hypertable_name
  })
  await client.end();
  console.log('chunkNames updated');
}

const extractColumnData = (value: any): any => {

  if (typeof value === "string") {
    return `'${value.replace(/'/g, "''")}'`;
  } else if (typeof value === "number") {
    return value;
  } else if (typeof value === "boolean") {
    return value;
  } else if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  } else if (Array.isArray(value)) {
    return `'${JSON.stringify(value)}'`;
  } else if (typeof value === "object") {
    if (value === null) {
      return 'NULL';
    }
    const result = [];
    for (const key in value) {
      result.push(`${key}: ${extractColumnData(value[key])}`);
    }
    return `{${result.join(", ")}}`;
  }
  return value;
}

// (async () => {
const db = await Database.create(process.env.DUCK_PATH!);

await syncDuck(db);

await getTableNamesByChunk();

// run getTableNamesByChunk every 10 minutes
(() => {
  const interval = setInterval(getTableNamesByChunk, 1000 * 60 * 10)
  return () => clearInterval(interval)
})();

const slotName = 'arryt_to_duck';

const service = new LogicalReplicationService(
  /**
   * node-postgres Client options for connection
   * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/pg/index.d.ts#L16
   */
  {
    database: process.env.PG_DB_NAME,
    user: process.env.PG_DB_USER,
    password: process.env.PG_DB_PASSWORD,
    host: process.env.PG_DB_HOST,
    port: +process.env.PG_DB_PORT!,
    application_name: 'arryt_duck',
    // ...
  },
  /**
   * Logical replication service config
   * https://github.com/kibae/pg-logical-replication/blob/main/src/logical-replication-service.ts#L9
   */
  {
    acknowledge: {
      auto: true,
      timeoutSeconds: 10
    }
  }
)

const plugin = new PgoutputPlugin({
  protoVersion: 2,
  publicationNames: ['arryt'],
});

/**
 * Wal2Json.Output
 * https://github.com/kibae/pg-logical-replication/blob/ts-main/src/output-plugins/wal2json/wal2json-plugin-output.type.ts
 */
service.on('data', async (lsn: string, log: Pgoutput.Message) => {
  // console.log('lsn', lsn)
  // console.log('log', log)

  switch (log.tag) {
    case 'insert': {
      const table = tableByChunk[log.relation.name] || log.relation.name;
      // console.log(`
      //   INSERT INTO ${table} (${Object.keys(log.new).join(", ")}) VALUES (${Object.values(log.new).map((val) => extractColumnData(val)).join(", ")})
      // `)
      await db.all(`
          INSERT INTO ${table} (${Object.keys(log.new).join(", ")}) VALUES (${Object.values(log.new).map((val) => extractColumnData(val)).join(", ")});
        `)
      break;
    }

    case 'update': {
      const table = tableByChunk[log.relation.name] || log.relation.name;
      // console.log(`
      //     UPDATE ${table} SET ${Object.keys(log.new).map((key) => `${key} = ${extractColumnData(log.new[key])}`).join(", ")} WHERE id = '${log.new.id}'
      //   `)
      await db.all(`
            UPDATE ${table} SET ${Object.keys(log.new).map((key) => `${key} = ${extractColumnData(log.new[key])}`).join(", ")} WHERE id = '${log.new.id}'
          `)
      break;
    }

    case 'delete': {
      const table = tableByChunk[log.relation.name] || log.relation.name;
      if (log.key?.id) {
        //   console.log(`
        //   DELETE FROM ${table} WHERE id = '${log.key?.id}'
        // `)
        await db.all(`
          DELETE FROM ${table} WHERE id = '${log.key?.id}'
        `)

      }
      break;
    }
  }

  // Do something what you want.
  // log.change.filter((change) => change.kind === 'insert').length;
});

// (function proc() {
service.subscribe(plugin, slotName)
//     .catch((e) => {
//       console.error(e);
//     })
//     .then(() => {
//       setTimeout(proc, 100);
//     });
// })();

const app = new Elysia()
  .decorate('db', db)
  .get("/", () => {
    return "Hello Hono!";
  })
  // Вывыод всех транзакций по выводу средств
  .get("/manager_withdraw/:id/transactions", async ({ params: { id } }) => {
    const transactions = await db.all(`
    select "manager_withdraw_transactions"."id" as "withdraw_id",
       "manager_withdraw_transactions"."amount" as "withdraw_amount",
       "manager_withdraw_transactions"."created_at" as "withdraw_created_at",
       "order_transactions"."id" as "transaction_id",
       "order_transactions"."created_at" as "transaction_created_at",
       "orders"."delivery_price" as "order_delivery_price",
       "orders"."order_number" as "order_number",
       "orders"."created_at" as "order_created_at"
from "manager_withdraw_transactions"
         left join "order_transactions" on "manager_withdraw_transactions"."transaction_id" = "order_transactions"."id"
         left join "orders" on "order_transactions"."order_id" = "orders"."id"
where "manager_withdraw_transactions"."withdraw_id" = '${id}'
    `);

    return transactions;
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })
  // Вывод всех транзакций по начислению средств
  .post(
    "/order_transactions",
    async ({ body: { filter } }) => {

      let where = "";

      if (filter.length > 0) {
        where = `WHERE ${filter
          .map((item: any) => {
            switch (item.operator) {
              case "contains":
                return `${item.field} LIKE '%${item.value}%'`;
              case "eq":
                return `${item.field} = '${item.value}'`;
              case "gt":
                return `${item.field} > '${item.value}'`;
              case "lt":
                return `${item.field} < '${item.value}'`;
              case "gte":
                return `${item.field} >= '${item.value}'`;
              case "lte":
                return `${item.field} <= '${item.value}'`;
              default:
                return `${item.field} ${item.operator} '${item.value}'`;
            }
          })
          .join(" AND ")}`;
      }

      const sqlQuery = `
      SELECT
          "order_transactions"."id",
          "order_transactions"."order_id",
          "order_transactions"."created_at",
          "order_transactions"."amount",
          "order_transactions"."status",
          "order_transactions"."balance_before",
          "order_transactions"."balance_after",
          "order_transactions"."comment",
          "order_transactions"."not_paid_amount",
          "order_transactions"."transaction_type",
          "orders"."order_number" as "order_number",
          "terminals"."name" as "terminal_name",
          "users"."first_name" as "first_name",
          "users"."last_name" as "last_name"
      FROM order_transactions
      LEFT JOIN terminals ON terminals.id = order_transactions.terminal_id
      LEFT JOIN orders ON orders.id = order_transactions.order_id
      LEFT JOIN users ON users.id = order_transactions.created_by
      ${where}
      ORDER BY order_transactions.created_at DESC;
    `;

      const data = await db.all(sqlQuery);

      return data;
    }, {
    body: t.Object({
      filter: t.Array(
        t.Object({
          field: t.String(),
          operator: t.String(),
          value: t.String(),
        })
      ),
    }),
  }
  ).post(
    "/courier_efficiency/hour",
    async ({
      body: { startDate, endDate, courierId, terminalIds },
    }) => {

      const data = await db.all(`WITH total_orders AS (
     SELECT terminal_id,
            date_trunc('day', created_at) AS order_day,
            extract(hour from created_at) + 5 AS order_hour,
            array_agg(courier_id) AS courier_ids,
            count(*) AS total_count
     FROM orders
     WHERE created_at BETWEEN '${startDate}' AND '${endDate}' AND terminal_id IN ('${terminalIds.join(
        "','"
      )}')
     GROUP BY terminal_id, order_day, order_hour
 ), courier_orders AS (
     SELECT terminal_id, courier_id,
            date_trunc('day', created_at) AS order_day,
            extract(hour from created_at) + 5 AS order_hour,
            count(*) AS courier_count
     FROM orders
     WHERE created_at BETWEEN '${startDate}' AND '${endDate}'
       AND courier_id = '${courierId}'
       AND terminal_id IN ('${terminalIds.join("','")}')
     GROUP BY terminal_id, courier_id, order_day, order_hour
 )
 SELECT courier_orders.terminal_id, courier_orders.courier_id, courier_orders.order_hour, courier_orders.order_day,
        courier_orders.courier_count, total_orders.total_count, total_orders.courier_ids,
        (courier_orders.courier_count / total_orders.total_count) * 100 AS courier_percentage
 FROM total_orders
          JOIN courier_orders
               ON total_orders.terminal_id = courier_orders.terminal_id
                   AND total_orders.order_day = courier_orders.order_day
                   AND total_orders.order_hour = courier_orders.order_hour
 ORDER BY courier_orders.terminal_id, courier_orders.order_day, courier_orders.order_hour`);

      return data;
    }, {
    body: t.Object({
      startDate: t.String(),
      endDate: t.String(),
      courierId: t.String(),
      terminalIds: t.Array(t.String()),
    }),
  }
  ).post(
    "/courier_efficiency/period",
    async ({
      body: { startDate, endDate, courierId, terminalIds },
    }) => {
      const data = await db.all(`WITH total_orders AS (
     SELECT terminal_id,
            date_trunc('day', created_at) AS order_day,
            (CASE
                 WHEN extract(hour from created_at) BETWEEN 5 AND 9 THEN '10:00-15:00'
                 WHEN extract(hour from created_at) BETWEEN 10 AND 16 THEN '15:00-22:00'
                 ELSE '22:00-03:00'
                END) AS hour_period,
            array_agg(courier_id) AS courier_ids,
            count(*) AS total_count
     FROM orders
     WHERE created_at BETWEEN '${startDate}' AND '${endDate}' AND terminal_id IN ('${terminalIds.join(
        "','"
      )}')
     GROUP BY terminal_id, order_day, hour_period
 ), courier_orders AS (
     SELECT terminal_id, courier_id,
            date_trunc('day', created_at) AS order_day,
            (CASE
                 WHEN extract(hour from created_at) BETWEEN 5 AND 9 THEN '10:00-15:00'
                 WHEN extract(hour from created_at) BETWEEN 10 AND 16 THEN '15:00-22:00'
                 ELSE '22:00-03:00'
                END) AS hour_period,
            count(*) AS courier_count
     FROM orders
     WHERE created_at BETWEEN '${startDate}' AND '${endDate}'
       AND courier_id = '${courierId}'
       AND terminal_id IN ('${terminalIds.join("','")}')
     GROUP BY terminal_id, courier_id, order_day, hour_period
 )
 SELECT courier_orders.terminal_id, courier_orders.courier_id, courier_orders.hour_period, courier_orders.order_day,
        courier_orders.courier_count, total_orders.total_count, total_orders.courier_ids,
        (courier_orders.courier_count / total_orders.total_count) * 100 AS courier_percentage
 FROM total_orders
          JOIN courier_orders
               ON total_orders.terminal_id = courier_orders.terminal_id
                   AND total_orders.order_day = courier_orders.order_day
                   AND total_orders.hour_period = courier_orders.hour_period
 ORDER BY courier_orders.terminal_id, courier_orders.order_day, courier_orders.hour_period`);

      const resultData = {};

      data.map((item) => {
        if (
          !resultData[
          `${dayjs(item.order_day).format("YYYY-MM-DD")}_${item.courier_id}`
          ]
        ) {
          resultData[
            `${dayjs(item.order_day).format("YYYY-MM-DD")}_${item.courier_id}`
          ] = {
            id: `${dayjs(item.order_day).format("YYYY-MM-DD")}_${item.courier_id
              }`,
            courier_id: item.courier_id,
            order_day: dayjs(item.order_day).format("DD.MM.YYYY"),
            hour_period: [],
          };
        }

        let couriersForPeriod = item.courier_ids ? item.courier_ids : [];
        if (couriersForPeriod.length) {
          couriersForPeriod = couriersForPeriod.filter(
            (courierId) => courierId !== null
          );
          couriersForPeriod = uniq(couriersForPeriod);
        }

        const countOfCouriers = couriersForPeriod.length;

        resultData[
          `${dayjs(item.order_day).format("YYYY-MM-DD")}_${item.courier_id}`
        ].hour_period.push({
          period: item.hour_period,
          courier_count: Number(item.courier_count),
          total_count: Number(item.total_count),
          efficiency: (
            (Number(item.courier_count) /
              (Number(item.total_count) / countOfCouriers)) *
            100
          ).toFixed(1),
          courier_ids: couriersForPeriod,
        });
      });

      Object.keys(resultData).map((key) => {
        resultData[key].efficiency = (
          resultData[key].hour_period.reduce((acc, item) => {
            return acc + Number(item.efficiency);
          }, 0) / resultData[key].hour_period.length
        ).toFixed(1);
      });
      return Object.values(resultData);
    }, {
    body: t.Object({
      startDate: t.String(),
      endDate: t.String(),
      courierId: t.String(),
      terminalIds: t.Array(t.String()),
    }),
  }
  ).post(
    "/couriers/profile_numbers",
    async ({
      body: { courierId },
    }) => {
      try {
        console.log("courierId", courierId);
        const sqlScoreQuery = `
      FROM orders
      SELECT avg(score) as avg_score
      WHERE courier_id = '${courierId}' and score is not null and created_at >= '${dayjs()
            .startOf("month")
            .format("YYYY-MM-DD HH:mm:ss")}' and created_at <= '${dayjs()
              .endOf("month")
              .add(1, "day")
              .format("YYYY-MM-DD HH:mm:ss")}'
      GROUP BY courier_id;
    `;

        const sqlTotalBalanceQuery = `
      SELECT sum(not_paid_amount) as not_paid_amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and transaction_type != 'work_schedule_bonus' and status = 'pending';
    `;

        const sqlTotalFuelQuery = `
      SELECT sum(not_paid_amount) as not_paid_amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and transaction_type = 'work_schedule_bonus' and status = 'pending';
    `;

        const score = await db.all(sqlScoreQuery);

        const not_paid_amount = await db.all(sqlTotalBalanceQuery);
        const fuel = await db.all(sqlTotalFuelQuery);
        console.log("result", {
          score: score[0]?.avg_score ?? 0,
          not_paid_amount: not_paid_amount[0]?.not_paid_amount ?? 0,
          fuel: fuel[0]?.not_paid_amount ?? 0,
        });
        return {
          score: score[0]?.avg_score ?? 0,
          not_paid_amount: not_paid_amount[0]?.not_paid_amount ?? 0,
          fuel: fuel[0]?.not_paid_amount ?? 0,
        };
      } catch (e) {
        console.log("error", e);
      }
    }, {
    body: t.Object({
      courierId: t.String(),
    }),
  }
  ).post(
    "/couriers/mobile_stats",
    async ({
      body: {
        courierId,
        startHour,
        endHour,
        finishedStatusIds,
        canceledStatusIds,
      },
    }) => {

      const currentHour = dayjs().hour();

      // today queries
      let fromDate = dayjs();
      let toDate = dayjs().add(1, "day");

      if (currentHour < startHour) {
        fromDate = fromDate.subtract(1, "day");
        toDate = dayjs();
      }

      const sqlTodayFinishedOrdersCountQuery = `
      SELECT count(*) as count
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${fromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${toDate
          .startOf("day")
          .hour(endHour)
          .format(
            "YYYY-MM-DD HH:mm:ss"
          )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      const sqlTodayCanceledOrdersCountQuery = `
      SELECT count(*) as count
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${fromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${toDate
          .startOf("day")
          .hour(endHour)
          .format(
            "YYYY-MM-DD HH:mm:ss"
          )}' and order_status_id in ('${canceledStatusIds.join("','")}');
    `;

      const sqlTodayFinishedOrdersAmountQuery = `
      SELECT sum(delivery_price) as amount
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${fromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${toDate
          .startOf("day")
          .hour(endHour)
          .format(
            "YYYY-MM-DD HH:mm:ss"
          )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      // yesterday queries
      let yesterdayFromDate = dayjs().subtract(1, "day");
      let yesterdayToDate = dayjs();

      if (currentHour < startHour) {
        yesterdayFromDate = yesterdayFromDate.subtract(1, "day");
        yesterdayToDate = dayjs().subtract(1, "day");
      }

      const sqlYesterdayFinishedOrdersCountQuery = `
      SELECT count(*) as count
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${yesterdayFromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${yesterdayToDate
          .startOf("day")
          .hour(endHour)
          .format(
            "YYYY-MM-DD HH:mm:ss"
          )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      const sqlYesterdayCanceledOrdersCountQuery = `
      SELECT count(*) as count
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${yesterdayFromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${yesterdayToDate
          .startOf("day")
          .hour(endHour)
          .format(
            "YYYY-MM-DD HH:mm:ss"
          )}' and order_status_id in ('${canceledStatusIds.join("','")}');
    `;

      const sqlYesterdayFinishedOrdersAmountQuery = `
      SELECT sum(delivery_price) as amount
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${yesterdayFromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${yesterdayToDate
          .startOf("day")
          .hour(endHour)
          .format(
            "YYYY-MM-DD HH:mm:ss"
          )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      // this week queries
      let startOfWeek = dayjs().startOf("week").hour(startHour);
      let endOfWeek = dayjs().endOf("week").add(1, "day").hour(endHour);

      const sqlWeekFinishedOrdersCountQuery = `
      SELECT count(*) as count
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      const sqlWeekCanceledOrdersCountQuery = `
      SELECT count(*) as count
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${canceledStatusIds.join("','")}');
    `;

      const sqlWeekFinishedOrdersAmountQuery = `
      SELECT sum(delivery_price) as amount
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      // this month queries
      let startOfMonth = dayjs().startOf("month").hour(startHour);
      let endOfMonth = dayjs().endOf("month").add(1, "day").hour(endHour);

      const sqlMonthFinishedOrdersCountQuery = `
      SELECT count(*) as count
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      const sqlMonthCanceledOrdersCountQuery = `
      SELECT count(*) as count
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${canceledStatusIds.join("','")}');
    `;

      const sqlMonthFinishedOrdersAmountQuery = `
      SELECT sum(delivery_price) as amount
      FROM orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      // today bonus queries
      const sqlTodayBonusQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${fromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${toDate
          .startOf("day")
          .hour(endHour)
          .format("YYYY-MM-DD HH:mm:ss")}' and transaction_type = 'order_bonus';
    `;

      // yesterday bonus queries
      const sqlYesterdayBonusQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${yesterdayFromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${yesterdayToDate
          .startOf("day")
          .hour(endHour)
          .format("YYYY-MM-DD HH:mm:ss")}' and transaction_type = 'order_bonus';
    `;

      // this week bonus queries
      const sqlWeekBonusQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${startOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and transaction_type = 'order_bonus';
    `;

      // this month bonus queries
      const sqlMonthBonusQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${startOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and transaction_type = 'order_bonus';
    `;

      // today daily_garant queries
      const sqlTodayDailyGarantQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${fromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${toDate
          .startOf("day")
          .hour(endHour)
          .format("YYYY-MM-DD HH:mm:ss")}' and transaction_type = 'daily_garant';
    `;

      // yesterday daily_garant queries
      const sqlYesterdayDailyGarantQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${yesterdayFromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${yesterdayToDate
          .startOf("day")
          .hour(endHour)
          .format("YYYY-MM-DD HH:mm:ss")}' and transaction_type = 'daily_garant';
    `;

      // this week daily_garant queries
      const sqlWeekDailyGarantQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${startOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and transaction_type = 'daily_garant';
    `;

      // this month daily_garant queries
      const sqlMonthDailyGarantQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${startOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and transaction_type = 'daily_garant';
    `;

      // today work_schedule_bonus queries
      const sqlTodayWorkScheduleBonusQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${fromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${toDate
          .startOf("day")
          .hour(endHour)
          .format(
            "YYYY-MM-DD HH:mm:ss"
          )}' and transaction_type = 'work_schedule_bonus';
    `;

      // yesterday work_schedule_bonus queries
      const sqlYesterdayWorkScheduleBonusQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${yesterdayFromDate
          .startOf("day")
          .hour(startHour)
          .format("YYYY-MM-DD HH:mm:ss")}'
      and created_at <= '${yesterdayToDate
          .startOf("day")
          .hour(endHour)
          .format(
            "YYYY-MM-DD HH:mm:ss"
          )}' and transaction_type = 'work_schedule_bonus';
    `;

      // this week work_schedule_bonus queries
      const sqlWeekWorkScheduleBonusQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${startOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and transaction_type = 'work_schedule_bonus';
    `;

      // this month work_schedule_bonus queries
      const sqlMonthWorkScheduleBonusQuery = `
      SELECT sum(amount) as amount
      FROM order_transactions
      WHERE courier_id = '${courierId}' and created_at >= '${startOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and transaction_type = 'work_schedule_bonus';
    `;

      const todayFinishedOrdersCount = await db.all(
        sqlTodayFinishedOrdersCountQuery
      );
      const todayCanceledOrdersCount = await db.all(
        sqlTodayCanceledOrdersCountQuery
      );
      const todayFinishedOrdersAmount = await db.all(
        sqlTodayFinishedOrdersAmountQuery
      );
      const todayBonus = await db.all(sqlTodayBonusQuery);
      const todayDailyGarant = await db.all(sqlTodayDailyGarantQuery);
      const todayWorkScheduleBonus = await db.all(
        sqlTodayWorkScheduleBonusQuery
      );

      const yesterdayFinishedOrdersCount = await db.all(
        sqlYesterdayFinishedOrdersCountQuery
      );
      const yesterdayCanceledOrdersCount = await db.all(
        sqlYesterdayCanceledOrdersCountQuery
      );
      const yesterdayFinishedOrdersAmount = await db.all(
        sqlYesterdayFinishedOrdersAmountQuery
      );
      const yesterdayBonus = await db.all(sqlYesterdayBonusQuery);
      const yesterdayDailyGarant = await db.all(sqlYesterdayDailyGarantQuery);
      const yesterdayWorkScheduleBonus = await db.all(
        sqlYesterdayWorkScheduleBonusQuery
      );

      const weekFinishedOrdersCount = await db.all(
        sqlWeekFinishedOrdersCountQuery
      );
      const weekCanceledOrdersCount = await db.all(
        sqlWeekCanceledOrdersCountQuery
      );
      const weekFinishedOrdersAmount = await db.all(
        sqlWeekFinishedOrdersAmountQuery
      );
      const weekBonus = await db.all(sqlWeekBonusQuery);
      const weekDailyGarant = await db.all(sqlWeekDailyGarantQuery);
      const weekWorkScheduleBonus = await db.all(sqlWeekWorkScheduleBonusQuery);

      const monthFinishedOrdersCount = await db.all(
        sqlMonthFinishedOrdersCountQuery
      );
      const monthCanceledOrdersCount = await db.all(
        sqlMonthCanceledOrdersCountQuery
      );
      const monthFinishedOrdersAmount = await db.all(
        sqlMonthFinishedOrdersAmountQuery
      );
      const monthBonus = await db.all(sqlMonthBonusQuery);
      const monthDailyGarant = await db.all(sqlMonthDailyGarantQuery);
      const monthWorkScheduleBonus = await db.all(
        sqlMonthWorkScheduleBonusQuery
      );

      return {
        today: {
          finishedOrdersCount: todayFinishedOrdersCount[0]?.count
            ? Number(todayFinishedOrdersCount[0]?.count)
            : 0,
          canceledOrdersCount: todayCanceledOrdersCount[0]?.count
            ? Number(todayCanceledOrdersCount[0]?.count)
            : 0,
          finishedOrdersAmount: todayFinishedOrdersAmount[0]?.amount
            ? Number(todayFinishedOrdersAmount[0]?.amount)
            : 0,
          bonus: todayBonus[0]?.amount ? Number(todayBonus[0]?.amount) : 0,
          dailyGarant: todayDailyGarant[0]?.amount
            ? Number(todayDailyGarant[0]?.amount)
            : 0,
          workScheduleBonus: todayWorkScheduleBonus[0]?.amount
            ? Number(todayWorkScheduleBonus[0]?.amount)
            : 0,
        },
        yesterday: {
          finishedOrdersCount: yesterdayFinishedOrdersCount[0]?.count
            ? Number(yesterdayFinishedOrdersCount[0]?.count)
            : 0,
          canceledOrdersCount: yesterdayCanceledOrdersCount[0]?.count
            ? Number(yesterdayCanceledOrdersCount[0]?.count)
            : 0,
          finishedOrdersAmount: yesterdayFinishedOrdersAmount[0]?.amount
            ? Number(yesterdayFinishedOrdersAmount[0]?.amount)
            : 0,
          bonus: yesterdayBonus[0]?.amount
            ? Number(yesterdayBonus[0]?.amount)
            : 0,
          dailyGarant: yesterdayDailyGarant[0]?.amount
            ? Number(yesterdayDailyGarant[0]?.amount)
            : 0,
          workScheduleBonus: yesterdayWorkScheduleBonus[0]?.amount
            ? Number(yesterdayWorkScheduleBonus[0]?.amount)
            : 0,
        },
        week: {
          finishedOrdersCount: weekFinishedOrdersCount[0]?.count
            ? Number(weekFinishedOrdersCount[0]?.count)
            : 0,
          canceledOrdersCount: weekCanceledOrdersCount[0]?.count
            ? Number(weekCanceledOrdersCount[0]?.count)
            : 0,
          finishedOrdersAmount: weekFinishedOrdersAmount[0]?.amount
            ? Number(weekFinishedOrdersAmount[0]?.amount)
            : 0,
          bonus: weekBonus[0]?.amount ? Number(weekBonus[0]?.amount) : 0,
          dailyGarant: weekDailyGarant[0]?.amount
            ? Number(weekDailyGarant[0]?.amount)
            : 0,
          workScheduleBonus: weekWorkScheduleBonus[0]?.amount
            ? Number(weekWorkScheduleBonus[0]?.amount)
            : 0,
        },
        month: {
          finishedOrdersCount: monthFinishedOrdersCount[0]?.count
            ? Number(monthFinishedOrdersCount[0]?.count)
            : 0,
          canceledOrdersCount: monthCanceledOrdersCount[0]?.count
            ? Number(monthCanceledOrdersCount[0]?.count)
            : 0,
          finishedOrdersAmount: monthFinishedOrdersAmount[0]?.amount
            ? Number(monthFinishedOrdersAmount[0]?.amount)
            : 0,
          bonus: monthBonus[0]?.amount ? Number(monthBonus[0]?.amount) : 0,
          dailyGarant: monthDailyGarant[0]?.amount
            ? Number(monthDailyGarant[0]?.amount)
            : 0,
          workScheduleBonus: monthWorkScheduleBonus[0]?.amount
            ? Number(monthWorkScheduleBonus[0]?.amount)
            : 0,
        },
      };
    }, {
    body: t.Object({
      courierId: t.String(),
      startHour: t.Number(),
      endHour: t.Number(),
      finishedStatusIds: t.Array(t.String()),
      canceledStatusIds: t.Array(t.String()),
    }),
  }
  )
  .post('/garant/prev_month_orders', async ({ body: { sqlPrevStartDate, sqlPrevEndDate, courierId }, db }) => {

    const sql = `select o.courier_id,
                                    count(o.courier_id) as total_orders
                             from orders o
                                      inner join order_status os on o.order_status_id = os.id and os.finish = true
                                      inner join users u on o.courier_id = u.id
                             where o.created_at >= '${sqlPrevStartDate} 00:00:00'
                               and o.created_at <= '${sqlPrevEndDate} 04:00:00'
                               and u.phone not in ('+998908251218', '+998908249891') ${courierId
        ? `and o.courier_id in (${courierId
          .map((id) => `'${id}'`)
          .join(",")})`
        : ""
      }
                             group by o.courier_id
                             order by o.courier_id;`;

    const data = await db.all(sql);

    return [...data].map((item) => {
      if (item.total_orders) {
        return {
          ...item,
          total_orders: Number(item.total_orders),
        };
      }
      return item;
    });
  }, {
    body: t.Object({
      sqlPrevStartDate: t.String(),
      sqlPrevEndDate: t.String(),
      courierId: t.Optional(t.Array(t.String())),
    }),
  })
  .post('/garant/bonus_query', async ({ body: { sqlStartDate, sqlEndDate }, db }) => {
    const sql = `select sum(amount) as total_amount, courier_id
                             from order_transactions
                             where status = 'success'
                               and transaction_type != 'order' and created_at >= '${sqlStartDate}' and created_at <= '${sqlEndDate}'
                             group by courier_id;`;

    const data = await db.all(sql);

    return [...data];
  }, {
    body: t.Object({
      sqlStartDate: t.String(),
      sqlEndDate: t.String(),
    }),
  })
  .post('/garant/couriers_by_terminal', async ({ body: { sqlStartDate, sqlEndDate, courierId }, db }) => {
    const sql = `select sum(o.delivery_price)                  as delivery_price,
                                    concat(u.first_name, ' ', u.last_name) as courier,
                                    o.courier_id,
                                    o.courier_id,
                                    o.organization_id,
                                    o.terminal_id
                             from orders o
                                      left join order_status os on o.order_status_id = os.id
                                      left join users u on o.courier_id = u.id
                             where o.created_at >= '${sqlStartDate}'
                               and o.created_at <= '${sqlEndDate}'
                               and os.finish = true ${courierId
        ? `and o.courier_id in (${courierId
          .map((id) => `'${id}'`)
          .join(",")})`
        : ""
      }
                             group by o.courier_id, o.terminal_id, o.organization_id, u.first_name, u.last_name
                             order by courier;`;

    const data = await db.all(sql);

    return [...data];
  }, {
    body: t.Object({
      sqlStartDate: t.String(),
      sqlEndDate: t.String(),
      courierId: t.Optional(t.Array(t.String())),
    }),
  })
  .post('/garant/custom_date_query', async ({ body: { order_start_date, courier_id, sqlEndDate }, db }) => {
    const sql = `
                                SELECT MIN(o.created_at)                                                   AS begin_date,
                                       MAX(o.created_at)                                                   AS last_order_date,
                                       SUM(o.delivery_price)                                               AS delivery_price,
                                       CONCAT(u.first_name, ' ', u.last_name)                              AS courier,
                                       COUNT(o.id)                                                         AS orders_count,
                                       AVG(EXTRACT(EPOCH FROM (o.finished_date - o.created_at)) / 60) AS avg_delivery_time,
                                       array_agg(date_trunc('day', o.created_at))                          AS orders_dates,
                                       o.courier_id
                                FROM orders o
                                         LEFT JOIN order_status os ON o.order_status_id = os.id
                                         LEFT JOIN users u ON o.courier_id = u.id
                                WHERE o.created_at >= '${order_start_date}'
                                  AND o.created_at <= '${sqlEndDate}'
                                  AND os.finish = true
                                  AND o.courier_id = '${courier_id}'
                                GROUP BY o.courier_id, u.first_name, u.last_name
                                ORDER BY courier;
                            `;

    const data = await db.all(sql);

    return [...data];
  }, {
    body: t.Object({
      order_start_date: t.String(),
      courier_id: t.String(),
      sqlEndDate: t.String(),
    }),
  })
  .post('/garant/balance_query', async ({ body: { sqlStartDate, sqlEndDate, courierIds }, db }) => {
    const sql = `select courier_id, sum(amount) as balance
                             from order_transactions
                             where courier_id in (${courierIds
        .map((id) => `'${id}'`)
        .join(
          ","
        )})
                               and status = 'pending'
                               and created_at >= '${sqlStartDate}'
                               and created_at <= '${sqlEndDate}'
                             group by courier_id`;
    const data = await db.all(sql);

    return [...data];
  }, {
    body: t.Object({
      sqlStartDate: t.String(),
      sqlEndDate: t.String(),
      courierIds: t.Array(t.String()),
    }),
  })
  .listen(9797);
// const transactionProtoPath = path.resolve(__dirname, '../../protos', 'arryt.proto');
// console.log('proto path', transactionProtoPath);
// const transactionProtoDefinitionLoader = loadSync(transactionProtoPath, {
//   keepCase: true,
//   longs: String,
//   enums: String,
//   defaults: true,
//   oneofs: true,
// });
// const transactionsProto = loadPackageDefinition(transactionProtoDefinitionLoader).arryt;
// console.log('transactionsProto', transactionsProto);
// console.log('transactionsProto.Transactions.service', transactionsProto.Transactions.service);
// const server = new Server();
// server.addService(transactionsProto.Transactions.service, {
//   getWithdrawTransactions: async (call: any, callback: any) => {
//     const { withdraw_id } = call.request;
//     console.log('withdraw_id', withdraw_id)
//     callback(null, {});
//   }
// });
// server.bindAsync(`0.0.0.0:${port}`, ServerCredentials.createInsecure(), (err) => {
//   if (err) {
//     console.error('Failed to bind to port', err);
//   }
//   server.start();
//   console.log(`Server is running on port ${port}`);
// });
// })();

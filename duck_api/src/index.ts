const dotenv = require("dotenv");
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import dayjs = require("dayjs");
import { Database } from "duckdb-async";
import { Hono } from "hono";
import { z } from "zod";
import { uniq } from "lodash";
import { Kafka } from "kafkajs";


dotenv.config();

(async () => {
  const db = await Database.create(process.env.DUCK_PATH!);
  const app = new Hono();

  const kafka = new Kafka({
    clientId: "arryy-duckdb",
    brokers: ["127.0.0.1:9092"],
  });


  const consumer = kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID || "test-group",

  });

  await consumer.connect();
  await consumer.subscribe({
    topics: [/arryt\.public.*/]
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const object = JSON.parse(message.value?.toString() || "{}");
      console.log("debezium event", object);
      if ('payload' in object) {
        const {
          payload: { before, after, source, op, ts_ms, source: { table } },
        } = object;

        if (!before) {
          const existingRecord = await db.all(`SELECT id FROM duckdb_${table} WHERE id = '${after.id}'`);
          if (existingRecord.length === 0) {
            db.all(`
          INSERT INTO duckdb_${table} (${Object.keys(after).join(", ")}) VALUES (${Object.values(after).map((val) => (typeof val === "string" ? `'${val}'` : val)).join(", ")})
          `)
          } else {
            db.all(`
          UPDATE duckdb_${table} SET ${Object.keys(after).map((key) => `${key} = ${typeof after[key] === "string" ? `'${after[key]}'` : after[key]}`).join(", ")} WHERE id = '${after.id}'
          `)
          }

        } else if (!after) {
          db.all(`
        DELETE FROM duckdb_${table} WHERE id = '${before.id}'
        `)
        }
      }

    },
  });

  app.get("/", (c) => {
    return c.text("Hello Hono!");
  });

  // Вывыод всех транзакций по выводу средств
  app.get("/manager_withdraw/:id/transactions", async (c) => {
    const { id } = c.req.param();
    const transactions = await db.all(`
    select "duckdb_manager_withdraw_transactions"."id" as "withdraw_id",
       "duckdb_manager_withdraw_transactions"."amount" as "withdraw_amount",
       "duckdb_manager_withdraw_transactions"."created_at" as "withdraw_created_at",
       "duckdb_order_transactions"."id" as "transaction_id",
       "duckdb_order_transactions"."created_at" as "transaction_created_at",
       "duckdb_orders"."delivery_price" as "order_delivery_price",
       "duckdb_orders"."order_number" as "order_number",
       "duckdb_orders"."created_at" as "order_created_at"
from "duckdb_manager_withdraw_transactions"
         left join "duckdb_order_transactions" on "duckdb_manager_withdraw_transactions"."transaction_id" = "duckdb_order_transactions"."id"
         left join "duckdb_orders" on "duckdb_order_transactions"."order_id" = "duckdb_orders"."id"
where "duckdb_manager_withdraw_transactions"."withdraw_id" = '${id}'
    `);

    return c.json(transactions);
  });

  // Вывод всех транзакций по начислению средств

  app.post(
    "/order_transactions",
    zValidator(
      "json",
      z.object({
        filter: z.array(
          z.object({
            field: z.string(),
            operator: z.string(),
            value: z.string(),
          })
        ),
      })
    ),
    async (c) => {
      const { filter } = await c.req.json();

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
          "duckdb_order_transactions"."id",
          "duckdb_order_transactions"."order_id",
          "duckdb_order_transactions"."created_at",
          "duckdb_order_transactions"."amount",
          "duckdb_order_transactions"."status",
          "duckdb_order_transactions"."balance_before",
          "duckdb_order_transactions"."balance_after",
          "duckdb_order_transactions"."comment",
          "duckdb_order_transactions"."not_paid_amount",
          "duckdb_order_transactions"."transaction_type",
          "duckdb_orders"."order_number" as "order_number",
          "duckdb_terminals"."name" as "terminal_name",
          "duckdb_users"."first_name" as "first_name",
          "duckdb_users"."last_name" as "last_name"
      FROM duckdb_order_transactions
      LEFT JOIN duckdb_terminals ON duckdb_terminals.id = duckdb_order_transactions.terminal_id
      LEFT JOIN duckdb_orders ON duckdb_orders.id = duckdb_order_transactions.order_id
      LEFT JOIN duckdb_users ON duckdb_users.id = duckdb_order_transactions.created_by
      ${where}
      ORDER BY duckdb_order_transactions.created_at DESC;
    `;

      const data = await db.all(sqlQuery);

      return c.json(data);
    }
  );

  app.post(
    "/courier_efficiency/hour",
    zValidator(
      "json",
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        courierId: z.string(),
        terminalIds: z.array(z.string()),
      })
    ),
    async (c) => {
      const { startDate, endDate, courierId, terminalIds } = await c.req.json();

      const data = await db.all(`WITH total_orders AS (
     SELECT terminal_id,
            date_trunc('day', created_at) AS order_day,
            extract(hour from created_at) + 5 AS order_hour,
            array_agg(courier_id) AS courier_ids,
            count(*) AS total_count
     FROM duckdb_orders
     WHERE created_at BETWEEN '${startDate}' AND '${endDate}' AND terminal_id IN ('${terminalIds.join(
        "','"
      )}')
     GROUP BY terminal_id, order_day, order_hour
 ), courier_orders AS (
     SELECT terminal_id, courier_id,
            date_trunc('day', created_at) AS order_day,
            extract(hour from created_at) + 5 AS order_hour,
            count(*) AS courier_count
     FROM duckdb_orders
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

      return c.json(data);
    }
  );

  app.post(
    "/courier_efficiency/period",
    zValidator(
      "json",
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        courierId: z.string(),
        terminalIds: z.array(z.string()),
      })
    ),
    async (c) => {
      const { startDate, endDate, courierId, terminalIds } = await c.req.json();
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
     FROM duckdb_orders
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
     FROM duckdb_orders
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
      return c.json(Object.values(resultData));
    }
  );

  app.post(
    "/couriers/profile_numbers",
    zValidator(
      "json",
      z.object({
        courierId: z.string(),
      })
    ),
    async (c) => {
      const { courierId } = await c.req.json();
      try {
        console.log("courierId", courierId);
        const sqlScoreQuery = `
      FROM duckdb_orders
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
      FROM duckdb_order_transactions
      WHERE courier_id = '${courierId}' and transaction_type != 'work_schedule_bonus' and status = 'pending';
    `;

        const sqlTotalFuelQuery = `
      SELECT sum(not_paid_amount) as not_paid_amount
      FROM duckdb_order_transactions
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
        return c.json({
          score: score[0]?.avg_score ?? 0,
          not_paid_amount: not_paid_amount[0]?.not_paid_amount ?? 0,
          fuel: fuel[0]?.not_paid_amount ?? 0,
        });
      } catch (e) {
        console.log("error", e);
      }
    }
  );

  app.post(
    "/couriers/mobile_stats",
    zValidator(
      "json",
      z.object({
        courierId: z.string(),
        startHour: z.number(),
        endHour: z.number(),
        finishedStatusIds: z.array(z.string()),
        canceledStatusIds: z.array(z.string()),
      })
    ),
    async (c) => {
      const {
        courierId,
        startHour,
        endHour,
        finishedStatusIds,
        canceledStatusIds,
      } = await c.req.json();

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
      FROM duckdb_orders
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
      FROM duckdb_orders
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
      FROM duckdb_orders
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
      FROM duckdb_orders
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
      FROM duckdb_orders
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
      FROM duckdb_orders
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
      FROM duckdb_orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      const sqlWeekCanceledOrdersCountQuery = `
      SELECT count(*) as count
      FROM duckdb_orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfWeek.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${canceledStatusIds.join("','")}');
    `;

      const sqlWeekFinishedOrdersAmountQuery = `
      SELECT sum(delivery_price) as amount
      FROM duckdb_orders
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
      FROM duckdb_orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${finishedStatusIds.join("','")}');
    `;

      const sqlMonthCanceledOrdersCountQuery = `
      SELECT count(*) as count
      FROM duckdb_orders
      WHERE courier_id = '${courierId}' and created_at >= '${startOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}'
      and created_at <= '${endOfMonth.format(
        "YYYY-MM-DD HH:mm:ss"
      )}' and order_status_id in ('${canceledStatusIds.join("','")}');
    `;

      const sqlMonthFinishedOrdersAmountQuery = `
      SELECT sum(delivery_price) as amount
      FROM duckdb_orders
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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
      FROM duckdb_order_transactions
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

      return c.json({
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
      });
    }
  );


  const port = 9797;
  console.log(`Server is running on port ${port}`);

  serve({
    fetch: app.fetch,
    port,
  });
})();

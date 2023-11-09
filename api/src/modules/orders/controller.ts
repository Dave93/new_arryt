import {
  customers,
  order_status,
  orders,
  organization,
  terminals,
  users,
  users_terminals,
} from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { checkRestPermission } from "@api/src/utils/check_rest_permissions";
import dayjs from "dayjs";
import {
  InferSelectModel,
  SQLWrapper,
  and,
  desc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import { SelectedFields, alias } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import Redis from "ioredis";
import { GarantReportItem } from "./dtos/reposts.dto";
import { isConstValueNode } from "graphql";
import postgres from "postgres";
import { getSetting } from "@api/src/utils/settings";
import utc from "dayjs/plugin/utc";

import isToday from "dayjs/plugin/isToday";
import isBetween from "dayjs/plugin/isBetween";

import timezone from "dayjs/plugin/timezone"; // dependent on utc plugin

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isToday);

function fancyTimeFormat(duration: number) {
  // Hours, minutes and seconds
  const hrs = ~~(+duration / 3600);
  const mins = ~~((+duration % 3600) / 60);
  const secs = ~~+duration % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  let ret = "";

  if (hrs > 0) {
    ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  }

  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;
  return ret;
}

type ReportCouriersByTerminal = {
  delivery_price: number;
  courier: string;
  courier_id: string;
  organization_id: string;
  terminal_id: string;
  terminal_name: string;
};

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
      }): Promise<GarantReportItem[]> => {
        const sqlStartDate = dayjs(startDate.split("T")[0])
          .add(1, "d")
          // .subtract(5, "hour")
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
        let organizationsList = JSON.parse(res || "[]") as InferSelectModel<
          typeof organization
        >[];
        const terminalsRes = await redis.get(
          `${process.env.PROJECT_PREFIX}_terminals`
        );
        let terminalsList = JSON.parse(
          terminalsRes || "[]"
        ) as InferSelectModel<typeof terminals>[];

        const prevMonthOrders = await db.execute<{
          courier_id: string;
          total_orders: number;
        }>(
          sql.raw(`select
              o.courier_id,
              count(o.courier_id) as total_orders
            from orders o
                    inner join order_status os on o.order_status_id = os.id and os.finish = true
                    inner join users u on o.courier_id = u.id
            where o.created_at >= '${sqlPrevStartDate} 00:00:00' and o.created_at <= '${sqlPrevEndDate} 04:00:00' and u.phone not in('+998908251218', '+998908249891') ${
            courierId
              ? `and o.courier_id in (${courierId
                  .map((id) => `'${id}'`)
                  .join(",")})`
              : ""
          }
            group by o.courier_id
            order by o.courier_id;`)
        );

        let query = await db.execute<GarantReportItem>(
          sql.raw(`select
            min(o.created_at) as begin_date,
            max(o.created_at) as last_order_date,
            sum(o.delivery_price) as delivery_price,
            concat(u.first_name, ' ', u.last_name) as courier,
            count(o.id) as orders_count,
            AVG(EXTRACT(EPOCH FROM (o.finished_date - o.created_at)) / 60) as avg_delivery_time,
            array_agg(o.created_at) as orders_dates,
            o.courier_id
        from orders o
                 left join order_status os on o.order_status_id = os.id
                 left join users u on o.courier_id = u.id
        where o.created_at >= '${sqlStartDate}' and o.created_at <= '${sqlEndDate}' and os.finish = true  and u.phone not in('+998908251218', '+998908249891') ${
            courierId
              ? `and o.courier_id in (${courierId
                  .map((id) => `'${id}'`)
                  .join(",")})`
              : ""
          }
        group by o.courier_id, u.first_name, u.last_name
        order by courier;`)
        );

        let bonusQuery = await db.execute<{
          courier_id: string;
          total_amount: number;
        }>(
          sql.raw(`select sum(amount) as total_amount, courier_id
        from order_transactions
        where status = 'success' and transaction_type != 'order' and created_at >= '${sqlStartDate}' and created_at <= '${sqlEndDate}'
        group by courier_id;`)
        );

        const couriersByTerminalById: Record<
          string,
          {
            id: string;
            name: string;
            children: ReportCouriersByTerminal[];
          }[]
        > = {};
        const couriersByTerminal = await db.execute<ReportCouriersByTerminal>(
          sql.raw(`select
            sum(o.delivery_price) as delivery_price,
            concat(u.first_name, ' ', u.last_name) as courier,
            o.courier_id,
            o.courier_id,
            o.organization_id,
            o.terminal_id
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
        group by o.courier_id, o.terminal_id, o.organization_id, u.first_name, u.last_name
        order by courier;`)
        );

        // console.log(couriersByTerminal);

        couriersByTerminal.forEach((item) => {
          if (!couriersByTerminalById[item.courier_id]) {
            couriersByTerminalById[item.courier_id] = [];
            organizationsList.forEach((org) => {
              couriersByTerminalById[item.courier_id].push({
                id: org.id,
                name: org.name,
                children: [],
              });
            });
          }
          organizationsList.forEach((org) => {
            if (org.id === item.organization_id) {
              couriersByTerminalById[item.courier_id].forEach((orgItem) => {
                if (orgItem.id === item.organization_id) {
                  const terminal = terminalsList.find(
                    (terminal) => terminal.id === item.terminal_id
                  );
                  orgItem.children.push({
                    ...item,
                    terminal_name: terminal ? terminal.name : "",
                  });
                }
              });
            }
          });
        });

        const prevMonthByCourier: {
          [key: string]: number;
        } = prevMonthOrders.reduce((acc, item) => {
          // @ts-ignore
          acc[item.courier_id] = item.total_orders;
          return acc;
        }, {});

        let courierIds = query
          .filter((item) => item.courier_id != null)
          .map((item) => item.courier_id);

        if (courierIds.length == 0) {
          return [];
        }

        let tempCouriers = await db
          .select({
            id: users.id,
            status: users.status,
            created_at: users.created_at,
            drive_type: users.drive_type,
            order_start_date: users.order_start_date,
            users_terminals: {
              name: terminals.name,
            },
          })
          .from(users)
          .leftJoin(users_terminals, eq(users.id, users_terminals.user_id))
          .leftJoin(terminals, eq(users_terminals.terminal_id, terminals.id))
          .where(
            courierIds.length > 0
              ? sql.raw(
                  `users.id in (${courierIds.map((id) => `'${id}'`).join(",")})`
                )
              : sql.raw("false")
          )
          .execute();

        const couriersObject: {
          [key: string]: {
            id: string;
            status: string;
            created_at: string;
            drive_type: "bycicle" | "foot" | "bike" | "car" | null;
            order_start_date: string | null;
            users_terminals: {
              terminals: {
                name: string;
              };
            }[];
          };
        } = {};

        tempCouriers.forEach((item) => {
          if (!couriersObject[item.id]) {
            couriersObject[item.id] = {
              ...item,
              users_terminals: [],
            };
          }
          if (item.users_terminals) {
            couriersObject[item.id].users_terminals.push({
              terminals: {
                name: item.users_terminals.name,
              },
            });
          }
        });

        const couriers = Object.values(couriersObject);

        // console.log("couriers", couriers);

        const customDateCouriers: {
          courier_id: string;
          order_start_date: string | null;
        }[] = [];
        couriers.forEach((item) => {
          if (dayjs(item.order_start_date).isSame(dayjs(), "month")) {
            customDateCouriers.push({
              courier_id: item.id,
              order_start_date: item.order_start_date,
            });
            delete couriersByTerminalById[item.id];
          }
        });
        // @ts-ignore
        query = query.filter(
          (item) =>
            customDateCouriers.find((i) => i.courier_id === item.courier_id) ==
            null
        );
        // @ts-ignore
        bonusQuery = bonusQuery.filter(
          (item) =>
            customDateCouriers.find((i) => i.courier_id === item.courier_id) ==
            null
        );

        if (customDateCouriers.length) {
          const customDateQueries: Promise<
            postgres.RowList<GarantReportItem[]>
          >[] = [];
          const transaction = customDateCouriers.forEach(async (item) => {
            const customDateQuery = await db.execute<GarantReportItem>(
              sql.raw(`
                SELECT MIN(o.created_at) AS begin_date,
                      MAX(o.created_at) AS last_order_date,
                      SUM(o.delivery_price) AS delivery_price,
                      CONCAT(u.first_name, ' ', u.last_name) AS courier,
                      COUNT(o.id) AS orders_count,
                      AVG(extract_duration('minute', age(o.finished_date, o.created_at))) AS avg_delivery_time,
                      array_agg(date_trunc('day', o.created_at)) AS orders_dates,
                      o.courier_id
                FROM orders o
                LEFT JOIN order_status os ON o.order_status_id = os.id
                LEFT JOIN users u ON o.courier_id = u.id
                WHERE o.created_at >= '${dayjs(item.order_start_date).format(
                  "YYYY-MM-DD"
                )} 00:00:00' AND o.created_at <= '${dayjs(sqlEndDate).format(
                "YYYY-MM-DD"
              )} 04:00:00' AND os.finish = true AND o.courier_id = '${
                item.courier_id
              }'
                GROUP BY o.courier_id, u.first_name, u.last_name
                ORDER BY courier;
              `)
            );
            // @ts-ignore
            customDateQueries.push(customDateQuery[0]);
          });

          await Promise.all(customDateQueries);

          if (customDateQueries.length) {
            customDateQueries.forEach((item) => {
              // @ts-ignore
              query.push(...item);
            });
          }

          // @ts-ignore
          const customTerminalQueries = [];
          const byTerminalTransaction = customDateCouriers.map(async (item) => {
            // @ts-ignore
            const customDateQuery = await this.prismaService.$queryRawUnsafe<
              GarantReportItem[]
            >(
              `
      SELECT SUM(o.delivery_price) AS delivery_price,
             CONCAT(u.first_name, ' ', u.last_name) AS courier,
             o.courier_id,
             o.courier_id,
             o.organization_id,
             o.terminal_id
      FROM orders o
      LEFT JOIN order_status os ON o.order_status_id = os.id
      LEFT JOIN users u ON o.courier_id = u.id
      WHERE o.created_at >= '${dayjs(item.order_start_date).format(
        "YYYY-MM-DD"
      )} 00:00:00' AND o.created_at <= '${dayjs(sqlEndDate).format(
                "YYYY-MM-DD"
              )} 04:00:00' AND os.finish = true AND o.courier_id = '${
                item.courier_id
              }'
      GROUP BY o.courier_id, o.terminal_id, o.organization_id, u.first_name, u.last_name
      ORDER BY courier;
    `
            );

            customTerminalQueries.push(customDateQuery);
          });

          await Promise.all(byTerminalTransaction);

          // console.log(customDateQueries);

          if (customTerminalQueries.length) {
            // customTerminalQueries.forEach((item) => {
            //   query.push(...item);
            // });

            // @ts-ignore
            customTerminalQueries.forEach((item) => {
              if (!couriersByTerminalById[item.courier_id]) {
                couriersByTerminalById[item.courier_id] = [];

                // @ts-ignore
                organizations.forEach((org) => {
                  couriersByTerminalById[item.courier_id].push({
                    id: org.id,
                    name: org.name,
                    children: [],
                  });
                });
              }

              // @ts-ignore
              organizations.forEach((org) => {
                if (org.id === item.organization_id) {
                  couriersByTerminalById[item.courier_id].forEach((orgItem) => {
                    if (orgItem.id === item.organization_id) {
                      // @ts-ignore
                      const terminal = terminals.find(
                        // @ts-ignore
                        (terminal) => terminal.id === item.terminal_id
                      );
                      orgItem.children.push({
                        ...item,
                        terminal_name: terminal ? terminal.name : "",
                      });
                    }
                  });
                }
              });
            });
          }

          if (customDateCouriers.length) {
            // @ts-ignore
            const customDateBonusQueries = [];
            const bonusTransaction = customDateCouriers.map(async (item) => {
              // @ts-ignore
              const customDateQuery = await this.prismaService.$queryRawUnsafe<
                {
                  courier_id: string;
                  total_amount: number;
                }[]
              >(`select sum(amount) as total_amount, courier_id
             from order_transactions
             where status = 'success'
               and transaction_type != 'order' and created_at >= '${sqlStartDate}' and created_at <= '${sqlEndDate}' and courier_id = '${item.courier_id}'
             group by courier_id;`);

              customDateBonusQueries.push(customDateQuery);
            });

            await Promise.all(bonusTransaction);

            // console.log(customDateQueries);

            if (customDateBonusQueries.length) {
              // @ts-ignore
              customDateBonusQueries.forEach((item) => {
                bonusQuery.push(...item);
              });
            }
          }
        }

        const bonusByCourier: {
          [key: string]: number;
        } = {};

        bonusQuery.forEach((item) => {
          if (!bonusByCourier[item.courier_id]) {
            bonusByCourier[item.courier_id] = 0;
          }
          bonusByCourier[item.courier_id] += item.total_amount;
        });

        const couriersById: {
          [key: string]: {
            id: string;
            status: "inactive" | "blocked" | "active";
            created_at: string;
            drive_type: "bycicle" | "foot" | "bike" | "car" | null;
            order_start_date: string | null;
            users_terminals: {
              terminals: {
                name: string;
              };
            }[];
          };
        } = couriers.reduce((acc, item) => {
          // @ts-ignore
          acc[item.id] = item;
          return acc;
        }, {});
        let walletQuery: {
          total_amount: number;
          courier_id: string;
        }[] = [];
        if (walletEndDate) {
          walletQuery = await db.execute<{
            total_amount: number;
            courier_id: string;
          }>(
            sql.raw(`select sum(amount) as total_amount, courier_id
              from order_transactions
              where status = 'pending' and created_at <= '${sqlWalletEndDate} 04:00:00'
              ${
                courierId
                  ? `and courier_id in (${courierId
                      .map((id) => `'${id}'`)
                      .join(",")})`
                  : courierIds.length
                  ? `and courier_id in (${courierIds
                      .map((id) => `'${id}'`)
                      .join(",")})`
                  : ""
              }
              group by courier_id`)
          );
        }

        // get couriers terminalIds
        const terminalIds = await db
          .select()
          .from(users_terminals)
          .where(inArray(users_terminals.user_id, courierIds))
          .execute();

        const terminalIdsByCourier: {
          [key: string]: string[];
        } = terminalIds.reduce((acc, item) => {
          // @ts-ignore
          if (!acc[item.user_id]) {
            // @ts-ignore
            acc[item.user_id] = [];
          }
          // @ts-ignore
          acc[item.user_id].push(item.terminal_id);
          return acc;
        }, {});

        if (filteredTerminalIds && filteredTerminalIds.length) {
          const filteredCourierIds = Object.keys(terminalIdsByCourier).filter(
            (courierId) => {
              const courierTerminalIds = terminalIdsByCourier[courierId];
              return courierTerminalIds.some((terminalId) =>
                filteredTerminalIds.includes(terminalId)
              );
            }
          );
          // @ts-ignore
          query = query.filter((item) =>
            filteredCourierIds.includes(item.courier_id)
          );
          courierIds = courierIds.filter((id) =>
            filteredCourierIds.includes(id)
          );
        }

        let workStartHour = await getSetting("work_start_time");
        workStartHour = new Date(workStartHour).getHours();
        // console.log('workStartHour', workStartHour);
        const balanceQuery = await db.execute<{
          courier_id: string;
          balance: number;
        }>(
          sql.raw(`select courier_id, sum(amount) as balance
          from order_transactions
            where courier_id in (${courierIds
              .map((id) => `'${id}'`)
              .join(
                ","
              )}) and status = 'pending' and created_at >= '${sqlStartDate}' and created_at <= '${sqlEndDate}'
          group by courier_id`)
        );

        const balanceById: {
          [key: string]: number;
        } = balanceQuery.reduce((acc, item) => {
          // @ts-ignore
          acc[item.courier_id] = item.balance;
          return acc;
        }, {});

        const result: GarantReportItem[] = [];

        let garantPricesJson = await getSetting("garant_prices");
        let garantPrices: {
          drive_type: string;
          price: number;
        }[] = [];
        let garantPrice = 5000000;
        let terminalCloseDays = await getSetting("terminal_close_days");
        try {
          garantPrices = JSON.parse(garantPricesJson || "[]");
        } catch (e) {
          console.log("can not calculate garant price", e);
        }
        try {
          terminalCloseDays = JSON.parse(terminalCloseDays);
          // group by terminal_id
          // @ts-ignore
          terminalCloseDays = terminalCloseDays.reduce((acc, item) => {
            if (!acc[item.terminal_id]) {
              acc[item.terminal_id] = [];
            }
            acc[item.terminal_id].push(dayjs(item.date.split("T")[0]));
            return acc;
          }, {});
        } catch (e) {
          console.log("can not parse terminal close days", e);
        }

        query.forEach((item) => {
          if (!item.courier_id) {
            return;
          }
          if (garantPrices) {
            const garantPriceObject = garantPrices.find(
              (priceItem) =>
                priceItem.drive_type ===
                couriersById[item.courier_id].drive_type
            );
            if (garantPriceObject) {
              garantPrice = +garantPriceObject.price;
            }
          }

          const resultItem = {
            ...item,
          };
          resultItem.orders_count = Number(resultItem.orders_count);

          const timesByDate: {
            [key: string]: Date;
          } = {};

          resultItem.orders_dates.forEach((date) => {
            if (!timesByDate[dayjs(date).format("DDMMYYYY")]) {
              timesByDate[dayjs(date).format("DDMMYYYY")] = date;
            } else {
              if (timesByDate[dayjs(date).format("DDMMYYYY")] < date) {
                timesByDate[dayjs(date).format("DDMMYYYY")] = date;
              }
            }
          });

          resultItem.orders_dates = Object.values(timesByDate).sort(
            (a, b) => a.getTime() - b.getTime()
          );
          let order_dates = [...resultItem.orders_dates];
          resultItem.delivery_price_orgs =
            couriersByTerminalById[item.courier_id];
          resultItem.bonus_total = bonusByCourier[item.courier_id] || 0;

          resultItem.drive_type = couriersById[item.courier_id].drive_type!;
          if (
            couriersById[item.courier_id].users_terminals &&
            couriersById[item.courier_id].users_terminals.length
          ) {
            if (couriersById[item.courier_id].users_terminals[0].terminals) {
              resultItem.terminal_name =
                couriersById[item.courier_id].users_terminals[0].terminals.name;
            }
          }

          // @ts-ignore
          couriersById[item.courier_id].created_at = new Date(
            couriersById[item.courier_id].created_at
          ).setHours(0, 0, 0, 0);
          resultItem.created_at = new Date(
            couriersById[item.courier_id].created_at
          );
          if (dayjs(resultItem.last_order_date).isToday()) {
            resultItem.last_order_date = dayjs(resultItem.last_order_date)
              .add(-1, "d")
              .toDate();
          }
          const userCreatedAtStart = dayjs(resultItem.created_at).format(
            "YYYY-MM-DD"
          );
          const firstOrderDateStart = dayjs(resultItem.begin_date).format(
            "YYYY-MM-DD"
          );
          const lastOrderDateStart = dayjs(resultItem.last_order_date).format(
            "YYYY-MM-DD"
          );
          const isRegisteredThisMonth = dayjs(userCreatedAtStart).isBetween(
            dayjs(firstOrderDateStart),
            dayjs(lastOrderDateStart),
            null,
            "[]"
          );
          let actualDayOffs = 0;
          let possibleDayOffs = 4;

          /*if (isRegisteredThisMonth) {
        // difference between first day and start date in weeks using dayjs
        const weeks = dayjs(lastOrderDateStart).diff(dayjs(firstOrderDateStart), 'week');
        possibleDayOffs = weeks;
      } else */
          if (
            dayjs(userCreatedAtStart).isBetween(
              dayjs(sqlStartDate),
              dayjs(sqlEndDate),
              null,
              "[]"
            )
          ) {
            const weeks = dayjs(lastOrderDateStart).diff(
              dayjs(userCreatedAtStart),
              "week"
            );
            possibleDayOffs = weeks;
            if (dayjs(sqlStartDate).isSame(dayjs(), "month")) {
              possibleDayOffs = dayjs(sqlEndDate).diff(
                dayjs(userCreatedAtStart),
                "week"
              );
            }
          }

          const datesBetween = [];
          let dayOffStartDate = [...order_dates][0];
          if (
            resultItem.created_at &&
            dayjs(resultItem.created_at).isBefore(dayjs(startDate))
          ) {
            if (prevMonthByCourier[item.courier_id]) {
              if (prevMonthByCourier[item.courier_id] > 0) {
                dayOffStartDate = dayjs(startDate.split("T")[0])
                  .add(1, "d")
                  .toDate();
              }
            }
          }
          const date = dayOffStartDate;
          let currentDate = dayjs(sqlEndDate).toDate();
          // check if sqlStartDate is current month
          if (dayjs(sqlStartDate).isSame(dayjs(), "month")) {
            currentDate = dayjs().add(-1, "d").toDate();
          }
          currentDate.setHours(0, 0, 0, 0);
          // date.setHours(0, 0, 0, 0);
          while (date < currentDate) {
            datesBetween.push(dayjs(date).hour(0).minute(0).second(0));
            date.setDate(date.getDate() + 1);
          }

          resultItem.actual_day_offs_list = [];

          datesBetween.forEach((date) => {
            const orderDate = order_dates.find((d) => {
              return (
                dayjs(d).format("YYYY-MM-DD") === date.format("YYYY-MM-DD")
              );
            });
            let isDayOff = false;
            if (!orderDate) {
              isDayOff = true;
            }

            if (isDayOff && terminalCloseDays) {
              const courierTerminals = terminalIdsByCourier[item.courier_id];
              if (courierTerminals) {
                courierTerminals.forEach((terminal) => {
                  const terminalCloseDates = terminalCloseDays[terminal];
                  if (terminalCloseDates) {
                    // @ts-ignore
                    const isTerminalCloseDay = terminalCloseDates.find((d) =>
                      dayjs(d).isSame(date)
                    );
                    if (isTerminalCloseDay) {
                      isDayOff = false;
                    }
                  }
                });
              }
            }

            if (isDayOff) {
              actualDayOffs++;
              resultItem.actual_day_offs_list.push(
                date.tz("Asia/Tashkent").add(1, "day").toDate()
              );
            }
          });

          resultItem.formatted_avg_delivery_time = fancyTimeFormat(
            +resultItem.avg_delivery_time
          );
          resultItem.actual_day_offs = actualDayOffs;

          let giveGarant = true;
          if (actualDayOffs > possibleDayOffs) {
            giveGarant = false;
          }
          const order_dates_day: string[] = [];
          order_dates.forEach((date) => {
            const dateObj = dayjs(date); //.add(5, 'hour');
            const hour = dateObj.hour();
            let dateString = dateObj.format("YYYY-MM-DD");
            if (hour < workStartHour) {
              dateString = dateObj.subtract(1, "day").format("YYYY-MM-DD");
            }

            if (!order_dates_day.includes(dateString)) {
              order_dates_day.push(dateString);
            }
          });
          resultItem.order_dates_count = order_dates_day.length;
          if (walletEndDate) {
            resultItem.balance =
              walletQuery.find(
                (walletItem) => walletItem.courier_id === item.courier_id
              )?.total_amount || 0;
          } else {
            resultItem.balance = balanceById[item.courier_id]
              ? +balanceById[item.courier_id]
              : 0;
          }

          resultItem.earned =
            +resultItem.delivery_price -
            +resultItem.balance +
            +resultItem.bonus_total;
          currentDate = dayjs(sqlEndDate).toDate();
          // check if sqlStartDate is current month
          if (dayjs(sqlStartDate).isSame(dayjs(), "month")) {
            currentDate = dayjs().add(-1, "d").toDate();
          } else {
            currentDate = dayjs(currentDate).add(-1, "d").toDate();
          }
          currentDate.setHours(0, 0, 0, 0);
          const daysInMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
          ).getDate();
          const workDays =
            dayjs(resultItem.last_order_date).diff(
              dayjs(resultItem.begin_date),
              "day"
            ) + 1;
          resultItem.garant_days = resultItem.order_dates_count;
          if (giveGarant) {
            resultItem.garant_price =
              Math.round(
                ((garantPrice / daysInMonth) * resultItem.garant_days) / 1000
              ) * 1000;
            resultItem.balance_to_pay =
              Math.round(
                (resultItem.garant_price -
                  resultItem.delivery_price -
                  resultItem.bonus_total) /
                  1000
              ) * 1000;
          } else {
            const possibleGarantPrice =
              Math.round(((garantPrice / daysInMonth) * workDays) / 1000) *
              1000;
            resultItem.balance_to_pay = 0;
            resultItem.possible_garant_price =
              Math.round(
                ((garantPrice / daysInMonth) * resultItem.orders_dates.length) /
                  1000
              ) * 1000;
            resultItem.possible_garant_price =
              Math.round(
                (possibleGarantPrice -
                  resultItem.delivery_price -
                  resultItem.bonus_total) /
                  1000
              ) * 1000;
          }

          resultItem.possible_day_offs = possibleDayOffs;
          resultItem.status = couriersById[item.courier_id].status;
          result.push(resultItem);
        });
        return result;
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

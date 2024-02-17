import {
  manager_withdraw,
  manager_withdraw_transactions,
  order_transactions,
  orders,
  terminals,
  users,
} from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SQLWrapper, and, desc, eq, sql } from "drizzle-orm";
import { SelectedFields, alias } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { ManagerWithdrawTransactionsWithRelations, ManagerWithdrawWithRelations } from "./dto/list.dto";

export const ManagerWithdrawController = new Elysia({
  name: "@app/manager_withdraw",
})
  .use(ctx)
  .get(
    "/manager_withdraw",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle, set, user }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("manager_withdraw.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      const couriers = alias(users, "couriers");
      const managers = alias(users, "managers");
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, manager_withdraw, {
          managers,
          terminals,
          couriers,
        });
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, manager_withdraw, {
          managers,
          terminals,
          couriers,
        });
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(manager_withdraw)
        .leftJoin(terminals, eq(manager_withdraw.terminal_id, terminals.id))
        .leftJoin(managers, eq(manager_withdraw.manager_id, managers.id))
        .leftJoin(couriers, eq(manager_withdraw.courier_id, couriers.id))
        .where(and(...whereClause))
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(manager_withdraw)
        .leftJoin(terminals, eq(manager_withdraw.terminal_id, terminals.id))
        .leftJoin(managers, eq(manager_withdraw.manager_id, managers.id))
        .leftJoin(couriers, eq(manager_withdraw.courier_id, couriers.id))
        .where(and(...whereClause))
        .limit(+limit)
        .offset(+offset)
        .orderBy(desc(manager_withdraw.created_at))
        .execute() as ManagerWithdrawWithRelations[];
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
  .get('/manager_withdraw/:id/transactions', async ({ params: { id }, drizzle, set, user, duckdb }) => {

    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("manager_withdraw.list")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }

    console.log('transactions', drizzle
      .select({
        id: manager_withdraw_transactions.id,
        amount: manager_withdraw_transactions.amount,
        created_at: manager_withdraw_transactions.created_at,
        order_transactions: {
          id: order_transactions.id,
          created_at: order_transactions.created_at,
        },
        orders: {
          delivery_price: orders.delivery_price,
          order_number: orders.order_number,
          created_at: orders.created_at,
        }
      })
      .from(manager_withdraw_transactions)
      .leftJoin(order_transactions, eq(manager_withdraw_transactions.transaction_id, order_transactions.id))
      .leftJoin(orders, eq(order_transactions.order_id, orders.id))
      .where(eq(manager_withdraw_transactions.withdraw_id, id)).toSQL().sql)


    const newItems = duckdb.query(`
    select "duckdb_manager_withdraw_transactions"."id",
       "duckdb_manager_withdraw_transactions"."amount",
       "duckdb_manager_withdraw_transactions"."created_at",
       "duckdb_order_transactions"."id",
       "duckdb_order_transactions"."created_at",
       "duckdb_orders"."delivery_price",
       "duckdb_orders"."order_number",
       "duckdb_orders"."created_at"
from "duckdb_manager_withdraw_transactions"
         left join "duckdb_order_transactions" on "duckdb_manager_withdraw_transactions"."transaction_id" = "duckdb_order_transactions"."id"
         left join "duckdb_orders" on "duckdb_order_transactions"."order_id" = "duckdb_orders"."id"
where "duckdb_manager_withdraw_transactions"."withdraw_id" = '${id}'
    `);

    console.log('duck items', newItems);

    const items = await drizzle
      .select({
        id: manager_withdraw_transactions.id,
        amount: manager_withdraw_transactions.amount,
        created_at: manager_withdraw_transactions.created_at,
        order_transactions: {
          id: order_transactions.id,
          created_at: order_transactions.created_at,
        },
        orders: {
          delivery_price: orders.delivery_price,
          order_number: orders.order_number,
          created_at: orders.created_at,
        }
      })
      .from(manager_withdraw_transactions)
      .leftJoin(order_transactions, eq(manager_withdraw_transactions.transaction_id, order_transactions.id))
      .leftJoin(orders, eq(order_transactions.order_id, orders.id))
      .where(eq(manager_withdraw_transactions.withdraw_id, id))
      .execute() as ManagerWithdrawTransactionsWithRelations[];
    return items;
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })
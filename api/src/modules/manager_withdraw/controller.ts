import {
  manager_withdraw, manager_withdraw_transactions, order_transactions, orders, terminals,
  users
} from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SQLWrapper, and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { SelectedFields, alias } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { ManagerWithdrawTransactionsWithRelations, ManagerWithdrawWithRelations } from "./dto/list.dto";
import dayjs from "dayjs";

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
  .get('/manager_withdraw/:id/transactions', async ({ params: { id }, drizzle, set, user }) => {
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

    const withdrawPrepare = await drizzle
      .select({
        id: manager_withdraw.id,
        created_at: manager_withdraw.created_at,
      })
      .from(manager_withdraw)
      .where(eq(manager_withdraw.id, sql.placeholder('id')))
      .prepare('withdraw_by_id')

    const withdraw = await withdrawPrepare.execute({
      id
    });

    const itemsPrepare = await drizzle
      .select({
        withdraw_id: manager_withdraw_transactions.id,
        withdraw_amount: manager_withdraw_transactions.amount,
        created_at: manager_withdraw_transactions.created_at,
        transaction_id: order_transactions.id,
        transaction_created_at: order_transactions.created_at,
        order_delivery_price: orders.delivery_price,
        order_number: orders.order_number,
        order_created_at: orders.created_at,
      })
      .from(manager_withdraw_transactions)
      .leftJoin(order_transactions, eq(manager_withdraw_transactions.transaction_id, order_transactions.id))
      .leftJoin(orders, eq(order_transactions.order_id, orders.id))
      .where(and(
        eq(manager_withdraw_transactions.withdraw_id, sql.placeholder('id')),
        gte(manager_withdraw_transactions.created_at, sql.placeholder('gte_created_at')),
        lte(manager_withdraw_transactions.created_at, sql.placeholder('lte_created_at'))
      ))
      .prepare('transactions_by_withdraw_id')
    const items = await itemsPrepare.execute({
      id,
      gte_created_at: dayjs(withdraw[0].created_at).subtract(8, 'hour').toISOString(),
      lte_created_at: dayjs(withdraw[0].created_at).add(8, 'hour').toISOString()
    });
    return items;
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })
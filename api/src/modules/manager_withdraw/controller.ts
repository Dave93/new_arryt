import {
  manager_withdraw, terminals,
  users
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
  .get('/manager_withdraw/:id/transactions', async ({ params: { id }, drizzle, set, user }) => {
    console.time('manager_withdraw_transactions')
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
    console.time('transactionsClient')
    const transactionsResponse = await fetch(`${process.env.DUCK_API}/manager_withdraw/${id}/transactions`);

    console.timeEnd('transactionsClient')

    const items = await transactionsResponse.json() as ManagerWithdrawTransactionsWithRelations[];

    console.timeEnd('manager_withdraw_transactions')
    return items;
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })
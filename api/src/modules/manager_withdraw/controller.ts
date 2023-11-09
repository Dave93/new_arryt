import {
  manager_withdraw,
  orders,
  terminals,
  users,
} from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SQLWrapper, and, desc, eq, sql } from "drizzle-orm";
import { SelectedFields, alias } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import Redis from "ioredis";

export const ManagerWithdrawController = (
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
  app.get(
    "/api/manager_withdraw",
    async ({ query: { limit, offset, sort, filters, fields } }) => {
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
      const rolesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(manager_withdraw)
        .leftJoin(terminals, eq(manager_withdraw.terminal_id, terminals.id))
        .leftJoin(managers, eq(manager_withdraw.manager_id, managers.id))
        .leftJoin(couriers, eq(manager_withdraw.courier_id, couriers.id))
        .where(and(...whereClause))
        .execute();
      const rolesList = await db
        .select(selectFields)
        .from(manager_withdraw)
        .leftJoin(terminals, eq(manager_withdraw.terminal_id, terminals.id))
        .leftJoin(managers, eq(manager_withdraw.manager_id, managers.id))
        .leftJoin(couriers, eq(manager_withdraw.courier_id, couriers.id))
        .where(and(...whereClause))
        .limit(+limit)
        .offset(+offset)
        .orderBy(desc(manager_withdraw.created_at))
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
  );

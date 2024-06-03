import {
  api_tokens,
  daily_garant,
} from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";

export const DailyGarantController = new Elysia({
  name: "@app/daily_garant",
})
  .use(ctx)
  .get(
    "/daily_garant",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("daily_garant.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, daily_garant, {});
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, daily_garant, {});
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(daily_garant)
        .where(and(...whereClause))
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(daily_garant)
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
  .get("/daily_garant/cached", async ({ redis, user, set, cacheControl }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("daily_garant.list")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }
    const res = await cacheControl.getDailyGarant();
    return res;
  })
  .get(
    "/daily_garant/:id",
    async ({ params: { id }, drizzle, set, user }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("daily_garant.show")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      const permissionsRecord = await drizzle
        .select()
        .from(daily_garant)
        .where(eq(daily_garant.id, id))
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
    "/daily_garant",
    async ({ body: { data, fields }, drizzle, user, set }) => {

      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("daily_garant.create")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, daily_garant, {});
      }
      const result = await drizzle
        .insert(daily_garant)
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
          date: t.String(),
          amount: t.Number(),
          late_minus_sum: t.Number(),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "daily_garant/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("daily_garant.edit")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, api_tokens, {});
      }
      const result = await drizzle
        .update(daily_garant)
        .set(data)
        .where(eq(daily_garant.id, id))
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
          date: t.String(),
          amount: t.Number(),
          late_minus_sum: t.Number(),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )

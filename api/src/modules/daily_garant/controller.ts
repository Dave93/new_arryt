import {
  api_tokens,
  daily_garant,
} from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
import dayjs from "dayjs";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";

export const DailyGarantController = new Elysia({
  name: "@app/daily_garant",
  prefix: "/api/daily_garant",
})
  .use(contextWitUser)
  .get(
    "/",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
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
      permission: 'daily_garant.list',
      query: t.Object({
        limit: t.String(),
        offset: t.String(),
        sort: t.Optional(t.String()),
        filters: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .get("/cached", async ({ redis, cacheControl }) => {
    const res = await cacheControl.getDailyGarant();
    return res;
  }, {
    permission: 'daily_garant.list',
  })
  .get(
    "/:id",
    async ({ params: { id }, drizzle }) => {
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
      permission: 'daily_garant.show',
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ body: { data, fields }, drizzle }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, daily_garant, {});
      }
      if (data.date && data.date.length > 8) {
        try {
          data.date = dayjs(data.date).format("HH:mm:ss");
        } catch (e) {
          console.log('data.date', data.date);
        }
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
      permission: 'daily_garant.create',
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
    "/:id",
    async ({ params: { id }, body: { data, fields }, drizzle }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, api_tokens, {});
      }

      if (data.date && data.date.length > 8) {
        try {
          data.date = dayjs(data.date).format("HH:mm:ss");
        } catch (e) {
          console.log('data.date', data.date);
        }
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
      permission: 'daily_garant.edit',
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

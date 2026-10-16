import {
  api_tokens,
  daily_garant,
  users,
} from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
import dayjs from "dayjs";
import {
  isValidTime,
  MAX_WORK_HOURS,
  MIN_WORK_HOURS,
  shiftHours,
} from "../../services/daily_garant/calculate";
import { SQLWrapper, and, eq, isNull, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";

/**
 * График тарифа: начало и конец смены задаются вместе, часы в смене
 * считаются из них — клиенту не доверяем.
 */
function tariffSchedule(data: { start_time?: string; end_time?: string; work_hours?: number }):
  | { start_time?: string; end_time?: string; work_hours?: number }
  | { error: string } {
  const { start_time, end_time } = data;
  if (!start_time && !end_time) return {};
  if (!isValidTime(start_time) || !isValidTime(end_time)) {
    return { error: "Укажите начало и конец смены в формате ЧЧ:ММ" };
  }
  const work_hours = shiftHours(start_time, end_time);
  if (work_hours < MIN_WORK_HOURS) {
    return { error: `Смена должна быть не короче ${MIN_WORK_HOURS} ч` };
  }
  return { start_time, end_time, work_hours };
}

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
      // Тарифы в архиве не показываем
      whereClause.push(isNull(daily_garant.deleted_at));
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
    async ({ body: { data, fields }, drizzle, cacheControl, status }) => {
      const schedule = tariffSchedule(data);
      if ("error" in schedule) return status(400, { message: schedule.error });
      Object.assign(data, schedule);
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, daily_garant, {});
      }
      if (data.date && data.date.length > 8) {
        try {
          data.date = dayjs(data.date).format("HH:mm:ss");
        } catch (e) {
        }
      }
      // "Время начисления" больше не используется (гарант считается по смене),
      // но колонка в базе NOT NULL — ставим заглушку.
      const query = drizzle
        .insert(daily_garant)
        .values({ ...data, date: data.date || "00:00:00" });
      // returning({}) даёт "RETURNING" без колонок — ошибка Postgres
      // "syntax error at end of input"; без fields возвращаем всю строку.
      const result = Object.keys(selectFields).length
        ? await query.returning(selectFields)
        : await query.returning();
      // Форма курьера берёт тарифы из кэша — без этого новый тариф там не виден.
      await cacheControl.cacheDailyGarant();

      return {
        data: result[0],
      };
    },
    {
      permission: 'daily_garant.create',
      body: t.Object({
        data: t.Object({
          name: t.String(),
          date: t.Optional(t.String()),
          amount: t.Number(),
          late_minus_sum: t.Optional(t.Number()),
          start_time: t.Optional(t.String()),
          end_time: t.Optional(t.String()),
          work_hours: t.Optional(t.Number({ minimum: MIN_WORK_HOURS, maximum: MAX_WORK_HOURS })),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, cacheControl, status }) => {
      const schedule = tariffSchedule(data);
      if ("error" in schedule) return status(400, { message: schedule.error });
      Object.assign(data, schedule);
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, daily_garant, {});
      }

      if (data.date && data.date.length > 8) {
        try {
          data.date = dayjs(data.date).format("HH:mm:ss");
        } catch (e) {
        }
      }

      const query = drizzle
        .update(daily_garant)
        .set({ ...data, updated_at: new Date().toISOString() })
        .where(eq(daily_garant.id, id));
      // См. create: returning({}) ломает запрос.
      const result = Object.keys(selectFields).length
        ? await query.returning(selectFields)
        : await query.returning();
      await cacheControl.cacheDailyGarant();

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
          date: t.Optional(t.String()),
          amount: t.Number(),
          late_minus_sum: t.Optional(t.Number()),
          start_time: t.Optional(t.String()),
          end_time: t.Optional(t.String()),
          work_hours: t.Optional(t.Number({ minimum: MIN_WORK_HOURS, maximum: MAX_WORK_HOURS })),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, drizzle, cacheControl, status }) => {
      // Физически удалить нельзя: на тариф ссылаются курьеры и история
      // начислений daily_garant_tasks. Удаляем в архив.
      const assigned = await drizzle
        .select({ first_name: users.first_name, last_name: users.last_name })
        .from(users)
        .where(and(eq(users.daily_garant_id, id), eq(users.status, "active")));
      if (assigned.length > 0) {
        const names = assigned
          .map((u) => [u.first_name, u.last_name].filter(Boolean).join(" ").trim())
          .slice(0, 5)
          .join(", ");
        return status(400, {
          message:
            `Тариф назначен активным курьерам (${assigned.length}): ${names}` +
            (assigned.length > 5 ? " и др." : "") +
            ". Сначала смените им тариф.",
        });
      }
      const [result] = await drizzle
        .update(daily_garant)
        .set({ deleted_at: new Date().toISOString() })
        .where(and(eq(daily_garant.id, id), isNull(daily_garant.deleted_at)))
        .returning({ id: daily_garant.id });
      if (!result) {
        return status(404, { message: "Тариф не найден" });
      }
      await cacheControl.cacheDailyGarant();
      return { data: result };
    },
    {
      permission: "daily_garant.edit",
      params: t.Object({
        id: t.String(),
      }),
    }
  )

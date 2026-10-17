import {
  organization,
  users,
  users_work_schedules,
  work_schedules,
} from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
import dayjs from "dayjs";
import { SQLWrapper, and, eq, sql, getTableColumns, inArray, isNull, ne } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { WorkScheduleWithRelations } from "./dto/list.dto";

/**
 * Время графика из формы: "09:00", "09:00:00" или полная дата. dayjs("09:00")
 * без даты — Invalid Date, и база падала с "invalid input syntax for type time".
 */
function normalizeTime(value: string): string | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [h, min, sec = "00"] = [Number(m[1]), m[2], m[3]];
    return h < 24 && Number(min) < 60 ? `${String(h).padStart(2, "0")}:${min}:${sec}` : null;
  }
  const d = dayjs(value);
  return d.isValid() ? d.format("HH:mm:ss") : null;
}

/** Приводит три времени графика к HH:mm:ss; ошибка — какое поле неверное. */
function normalizeScheduleTimes(data: { start_time: string; end_time: string; max_start_time: string }) {
  const labels = { start_time: "начала", end_time: "окончания", max_start_time: "макс. начала" } as const;
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    const t = normalizeTime(data[key]);
    if (!t) return `Неверное время ${labels[key]}: «${data[key]}»`;
    data[key] = t;
  }
  return null;
}

export const WorkSchedulesController = new Elysia({
  name: "@app/work_schedules",
  prefix: "/api/work_schedules",
})
  .use(contextWitUser)
  .get(
    "/",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, work_schedules, {
          organization,
        });
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, work_schedules, {
          organization,
        });
      }
      // Удалённые (в архиве) графики не показываем
      whereClause.push(isNull(work_schedules.deleted_at));
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(work_schedules)
        .where(and(...whereClause))
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(work_schedules)
        .leftJoin(
          organization,
          eq(work_schedules.organization_id, organization.id)
        )
        .where(and(...whereClause))
        .limit(+limit)
        .offset(+offset)
        .execute() as WorkScheduleWithRelations[];
      return {
        total: rolesCount[0].count,
        data: rolesList,
      };
    },
    {
      permission: 'work_schedules.list',
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
    const res = await cacheControl.getWorkSchedules();
    return res;
  }, {
    permission: 'work_schedules.list',
  })
  .get(
    "/:id",
    async ({ params: { id }, drizzle }) => {
      const permissionsRecord = await drizzle
        .select()
        .from(work_schedules)
        .where(eq(work_schedules.id, id))
        .execute();
      return {
        data: permissionsRecord[0],
      };
    },
    {
      permission: 'work_schedules.show',
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/",
    async ({ body: { data, fields }, drizzle, cacheControl, status }) => {
      // Без fields возвращаем всю строку: returning({}) даёт пустой RETURNING —
      // ошибка Postgres "syntax error at end of input".
      let selectFields: {} = getTableColumns(work_schedules);
      if (fields) {
        selectFields = parseSelectFields(fields, work_schedules, {});
      }

      const timeError = normalizeScheduleTimes(data);
      if (timeError) return status(400, { message: timeError });
      const result = await drizzle
        .insert(work_schedules)
        .values(data)
        .returning(selectFields);
      await cacheControl.cacheWorkSchedules();
      return {
        data: result[0],
      };
    },
    {
      permission: 'work_schedules.create',
      body: t.Object({
        data: t.Object({
          name: t.String(),
          active: t.Boolean(),
          organization_id: t.String(),
          days: t.Array(t.String()),
          start_time: t.String(),
          end_time: t.String(),
          max_start_time: t.String(),
          bonus_price: t.Optional(t.Number()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, cacheControl, status }) => {
      // Без fields возвращаем всю строку: returning({}) даёт пустой RETURNING —
      // ошибка Postgres "syntax error at end of input".
      let selectFields: {} = getTableColumns(work_schedules);
      if (fields) {
        selectFields = parseSelectFields(fields, work_schedules, {});
      }

      const timeError = normalizeScheduleTimes(data);
      if (timeError) return status(400, { message: timeError });
      const result = await drizzle
        .update(work_schedules)
        .set(data)
        .where(eq(work_schedules.id, id))
        .returning(selectFields);

      await cacheControl.cacheWorkSchedules();
      return {
        data: result[0],
      };
    },
    {
      permission: 'work_schedules.edit',
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        data: t.Object({
          name: t.String(),
          active: t.Boolean(),
          organization_id: t.String(),
          days: t.Array(t.String()),
          start_time: t.String(),
          end_time: t.String(),
          max_start_time: t.String(),
          bonus_price: t.Optional(t.Number()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .get(
    "/:id/usage",
    async ({ params: { id }, drizzle }) => {
      // Для подтверждения удаления: кому из активных курьеров назначен график
      // и у кого он единственный — после удаления у них не останется графика.
      const assigned = await drizzle
        .select({ id: users.id, first_name: users.first_name, last_name: users.last_name })
        .from(users_work_schedules)
        .innerJoin(users, eq(users.id, users_work_schedules.user_id))
        .where(and(eq(users_work_schedules.work_schedule_id, id), eq(users.status, "active")));
      const ids = assigned.map((u) => u.id);
      const withOther = ids.length
        ? await drizzle
            .selectDistinct({ user_id: users_work_schedules.user_id })
            .from(users_work_schedules)
            .innerJoin(work_schedules, eq(work_schedules.id, users_work_schedules.work_schedule_id))
            .where(
              and(
                inArray(users_work_schedules.user_id, ids),
                ne(users_work_schedules.work_schedule_id, id),
                isNull(work_schedules.deleted_at)
              )
            )
        : [];
      const hasOther = new Set(withOther.map((r) => r.user_id));
      return {
        active_couriers: assigned.length,
        only_schedule: assigned
          .filter((u) => !hasOther.has(u.id))
          .map((u) => [u.first_name, u.last_name].filter(Boolean).join(" ").trim()),
      };
    },
    {
      permission: "work_schedules.edit",
      params: t.Object({ id: t.String() }),
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, drizzle, cacheControl, status }) => {
      // Физически удалить нельзя: на график ссылается история смен. Удаляем в
      // архив и снимаем его с курьеров — их остальные графики остаются.
      const result = await drizzle.transaction(async (tx) => {
        const [archived] = await tx
          .update(work_schedules)
          .set({ deleted_at: new Date().toISOString(), active: false })
          .where(and(eq(work_schedules.id, id), isNull(work_schedules.deleted_at)))
          .returning({ id: work_schedules.id });
        if (!archived) return null;
        const unassigned = await tx
          .delete(users_work_schedules)
          .where(eq(users_work_schedules.work_schedule_id, id))
          .returning({ user_id: users_work_schedules.user_id });
        return { id: archived.id, unassigned: unassigned.length };
      });
      if (!result) {
        return status(404, { message: "График не найден" });
      }
      await cacheControl.cacheWorkSchedules();
      return { data: result };
    },
    {
      permission: "work_schedules.edit",
      params: t.Object({ id: t.String() }),
    }
  )

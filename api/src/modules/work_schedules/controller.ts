import {
  organization,
  work_schedules,
} from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
import dayjs from "dayjs";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { WorkScheduleWithRelations } from "./dto/list.dto";

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
    async ({ body: { data, fields }, drizzle, cacheControl }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, work_schedules, {});
      }

      if (data.start_time) {
        data.start_time = dayjs(data.start_time).format("HH:mm:ss");
      }

      if (data.end_time) {
        data.end_time = dayjs(data.end_time).format("HH:mm:ss");
      }

      if (data.max_start_time) {
        data.max_start_time = dayjs(data.max_start_time).format("HH:mm:ss");
      }
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
    async ({ params: { id }, body: { data, fields }, drizzle, cacheControl }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, work_schedules, {});
      }

      if (data.start_time) {
        data.start_time = dayjs(data.start_time, "HH:mm:ss").format("HH:mm:ss");
      }

      if (data.end_time) {
        data.end_time = dayjs(data.end_time, "HH:mm:ss").format("HH:mm:ss");
      }

      if (data.max_start_time) {
        data.max_start_time = dayjs(data.max_start_time, "HH:mm:ss").format("HH:mm:ss");
      }
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
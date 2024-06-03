import {
  organization,
  work_schedules,
} from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import dayjs from "dayjs";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { WorkScheduleWithRelations } from "./dto/list.dto";

export const WorkSchedulesController = new Elysia({
  name: "@app/work_schedules",
})
  .use(ctx)
  .get(
    "/work_schedules",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("work_schedules.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
      query: t.Object({
        limit: t.String(),
        offset: t.String(),
        sort: t.Optional(t.String()),
        filters: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .get("/work_schedules/cached", async ({ redis, user, set, cacheControl }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("work_schedules.list")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }
    const res = await cacheControl.getWorkSchedules();
    return res;
  })
  .get(
    "/work_schedules/:id",
    async ({ params: { id }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("work_schedules.show")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/work_schedules",
    async ({ body: { data, fields }, drizzle, user, set, cacheControl }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("work_schedules.create")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
    "/work_schedules/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, user, set, cacheControl }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("work_schedules.edit")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
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
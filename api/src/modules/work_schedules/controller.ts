import {
  organization,
  work_schedules,
} from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import dayjs from "dayjs";
import { InferSelectModel, SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";

export const WorkSchedulesController = new Elysia({
  name: "@app/work_schedules",
})
  .use(ctx)
  .get(
    "/work_schedules",
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
  .get("/work_schedules/cached", async ({ redis }) => {
    const res = await redis.get(
      `${process.env.PROJECT_PREFIX}_work_schedules`
    );
    return JSON.parse(res || "[]") as InferSelectModel<typeof work_schedules>[];
  })
  .get(
    "/work_schedules/:id",
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
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/work_schedules",
    async ({ body: { data, fields }, drizzle }) => {
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

      return {
        data: result[0],
      };
    },
    {
      body: t.Object({
        data: createInsertSchema(work_schedules) as any,
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/work_schedules/:id",
    async ({ params: { id }, body: { data, fields }, drizzle }) => {
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
        .update(work_schedules)
        .set(data)
        .where(eq(work_schedules.id, id))
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
        data: createInsertSchema(work_schedules) as any,
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
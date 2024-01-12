import {
  delivery_pricing,
  organization,
  organization_system_type,
  terminals,
  work_schedules,
} from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import dayjs from "dayjs";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import Redis from "ioredis";

export const WorkSchedulesController = (
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
  app
    .get(
      "/api/work_schedules",
      async ({ query: { limit, offset, sort, filters, fields } }) => {
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
        const rolesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(work_schedules)
          .where(and(...whereClause))
          .execute();
        const rolesList = await db
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
    .get("/api/work_schedules/cached", async ({ store: { redis } }) => {
      const res = await redis.get(
        `${process.env.PROJECT_PREFIX}_work_schedules`
      );
      return JSON.parse(res || "[]");
    })
    .get(
      "/api/work_schedules/:id",
      async ({ params: { id } }) => {
        const permissionsRecord = await db
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
      "/api/work_schedules",
      async ({ body: { data, fields } }) => {
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
        const result = await db
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
      "/api/work_schedules/:id",
      async ({ params: { id }, body: { data, fields } }) => {
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
        const result = await db
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
    );

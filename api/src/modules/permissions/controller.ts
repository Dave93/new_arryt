import { permissions } from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import Redis from "ioredis";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SelectedFields } from "drizzle-orm/pg-core";

export const PermissionsController = (
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
      "/api/permissions",
      async ({ query: { limit, offset, sort, filter, fields } }) => {
        let selectFields: SelectedFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, permissions, {});
        }
        const rolesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(permissions)
          .execute();
        const rolesList = await db
          .select(selectFields)
          .from(permissions)
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
          filter: t.Optional(
            t.Object({
              id: t.Number(),
              name: t.String(),
              email: t.String(),
              address: t.String(),
              phone: t.String(),
            })
          ),
          fields: t.Optional(t.String()),
        }),
      }
    )
    .get("/api/permissions/cached", async ({ store: { redis } }) => {
      const res = await redis.get(`${process.env.PROJECT_PREFIX}_permissions`);
      return JSON.parse(res || "[]");
    })
    .get(
      "/api/permissions/:id",
      async ({ params: { id } }) => {
        const permissionsRecord = await db
          .select()
          .from(permissions)
          .where(eq(permissions.id, id))
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
      "/api/permissions",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, permissions, {});
        }
        const result = await db
          .insert(permissions)
          .values(data)
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        body: t.Object({
          data: t.Object({
            slug: t.String(),
            description: t.String(),
            active: t.Optional(t.Boolean()),
          }),
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/permissions/:id",
      async ({ params: { id }, body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, permissions, {});
        }
        const result = await db
          .update(permissions)
          .set(data)
          .where(eq(permissions.id, id))
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
            slug: t.String(),
            description: t.String(),
            active: t.Optional(t.Boolean()),
          }),
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );

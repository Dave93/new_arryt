import { organization, organization_system_type } from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import Redis from "ioredis";

export const OrganizationsController = (
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
      "/api/organization",
      async ({ query: { limit, offset, sort, filter, fields } }) => {
        let selectFields: SelectedFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, organization, {});
        }
        const rolesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(organization)
          .execute();
        const rolesList = await db
          .select(selectFields)
          .from(organization)
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
    .get("/api/organizations/cached", async ({ store: { redis } }) => {
      const res = await redis.get(
        `${process.env.PROJECT_PREFIX}_organizations`
      );
      return JSON.parse(res || "[]");
    })
    .get(
      "/api/organization/:id",
      async ({ params: { id } }) => {
        const permissionsRecord = await db
          .select()
          .from(organization)
          .where(eq(organization.id, id))
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
      "/api/organization",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, organization, {});
        }
        const result = await db
          .insert(organization)
          .values(data)
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        body: t.Object({
          data: createInsertSchema(organization) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/organization/:id",
      async ({ params: { id }, body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, organization, {});
        }
        const result = await db
          .update(organization)
          .set(data)
          .where(eq(organization.id, id))
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
          data: createInsertSchema(organization) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );

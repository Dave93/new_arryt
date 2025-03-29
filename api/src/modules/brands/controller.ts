import { brands } from "../../../drizzle/schema";
import { contextWitUser } from "../../context";
import { parseFilterFields } from "../../lib/parseFilterFields";
import { parseSelectFields } from "../../lib/parseSelectFields";
import { InferSelectModel, SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";

export const BrandsController = new Elysia({
  name: "@app/brands",
  prefix: "/api/brands",
})
  .use(contextWitUser)
  .get(
    "/",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle }) => {
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, brands, {});
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, brands, {});
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(brands)
        .where(and(...whereClause))
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(brands)
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
  .get("/cached", async ({ redis }) => {
    const res = await redis.get(`${process.env.PROJECT_PREFIX}_brands`);
    return JSON.parse(res || "[]") as InferSelectModel<typeof brands>[];
  })
  .get(
    "/:id",
    async ({ params: { id }, drizzle }) => {
      const permissionsRecord = await drizzle
        .select()
        .from(brands)
        .where(eq(brands.id, id))
        .execute();
      return {
        data: permissionsRecord[0],
      };
    },
    {
      permission: 'brands.show',
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
        selectFields = parseSelectFields(fields, brands, {});
      }
      const result = await drizzle
        .insert(brands)
        .values(data)
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'brands.create',
      body: t.Object({
        data: t.Object({
          name: t.String(),
          api_url: t.String(),
          logo_path: t.Optional(t.String()),
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
        selectFields = parseSelectFields(fields, brands, {});
      }
      const result = await drizzle
        .update(brands)
        .set(data)
        .where(eq(brands.id, id))
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'brands.edit',
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        data: t.Object({
          name: t.String(),
          api_url: t.String(),
          logo_path: t.Optional(t.String()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  );

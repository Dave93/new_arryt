import { api_tokens, organization } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { InferSelectModel, SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { ApiTokensWithRelations } from "./dto/list.dto";

export const ApiTokensController = new Elysia({
  name: "@app/api_tokens",
})
  .use(ctx)
  .get(
    "/api_tokens",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle, user, set }) => {

      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, api_tokens, {
          organization,
        });
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, api_tokens, {
          organization,
        });
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(api_tokens)
        .where(and(...whereClause))
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(api_tokens)
        .leftJoin(organization, eq(api_tokens.organization_id, organization.id))
        .where(and(...whereClause))
        .limit(+limit)
        .offset(+offset)
        .execute() as ApiTokensWithRelations[];
      return {
        total: rolesCount[0].count,
        data: rolesList,
      };
    },
    {
      permission: 'api_tokens.list',
      query: t.Object({
        limit: t.String(),
        offset: t.String(),
        sort: t.Optional(t.String()),
        filters: t.Optional(t.String()),
        fields: t.Optional(t.String()),
      }),
    }
  )
  .get("/api_tokens/cached", async ({ redis, set, user }) => {
    const res = await redis.get(`${process.env.PROJECT_PREFIX}_api_tokens`);
    return JSON.parse(res || "[]") as InferSelectModel<typeof api_tokens>[];
  }, {
    permission: 'api_tokens.list',
  })
  .get(
    "/api_tokens/:id",
    async ({ params: { id }, drizzle }) => {
      const permissionsRecord = await drizzle
        .select()
        .from(api_tokens)
        .where(eq(api_tokens.id, id))
        .execute();
      return {
        data: permissionsRecord[0],
      };
    },
    {
      permission: 'api_tokens.show',
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/api_tokens",
    async ({ body: { data, fields }, drizzle, user, set }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, api_tokens, {});
      }
      const result = await drizzle
        .insert(api_tokens)
        .values(data)
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'api_tokens.create',
      body: t.Object({
        data: t.Object({
          active: t.Boolean(),
          token: t.String(),
          organization_id: t.String(),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/api_tokens/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, user, set }) => {
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, api_tokens, {});
      }
      const result = await drizzle
        .update(api_tokens)
        .set(data)
        .where(eq(api_tokens.id, id))
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      permission: 'api_tokens.edit',
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        data: t.Object({
          active: t.Boolean(),
          token: t.String(),
          organization_id: t.String(),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  );

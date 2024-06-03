import {
  organization,
  terminals,
} from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";
import { TerminalsWithRelations } from "./dto/list.dto";

export const TerminalsController = new Elysia({
  name: "@app/terminals",
})
  .use(ctx)
  .get(
    "/terminals",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("terminals.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, terminals, {
          organization,
        });
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, terminals, {
          organization,
        });
      }
      const rolesCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(terminals)
        .where(and(...whereClause))
        .execute();
      const rolesList = await drizzle
        .select(selectFields)
        .from(terminals)
        .leftJoin(
          organization,
          eq(terminals.organization_id, organization.id)
        )
        .where(and(...whereClause))
        .limit(+limit)
        .offset(+offset)
        .execute() as TerminalsWithRelations[];
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
  .get("/terminals/cached", async ({ redis, user, set, cacheControl }) => {
    if (!user) {
      set.status = 401;
      return {
        message: "User not found",
      };
    }

    if (!user.access.additionalPermissions.includes("terminals.list")) {
      set.status = 401;
      return {
        message: "You don't have permissions",
      };
    }
    const res = await cacheControl.getTerminals();
    return res;
  })
  .get(
    "/terminals/:id",
    async ({ params: { id }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("terminals.show")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      const permissionsRecord = await drizzle
        .select()
        .from(terminals)
        .where(eq(terminals.id, id))
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
    "/terminals",
    async ({ body: { data, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("terminals.create")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, terminals, {});
      }
      const result = await drizzle
        .insert(terminals)
        .values(data)
        .returning(selectFields);

      return {
        data: result[0],
      };
    },
    {
      body: t.Object({
        data: t.Object({
          name: t.String(),
          active: t.Optional(t.Boolean()),
          phone: t.Optional(t.String()),
          address: t.Optional(t.String()),
          latitude: t.Number(),
          longitude: t.Number(),
          external_id: t.String(),
          organization_id: t.String(),
          manager_name: t.Optional(t.String()),
          fuel_bonus: t.Optional(t.Boolean()),
          linked_terminal_id: t.Optional(t.String()),
          time_to_yandex: t.Optional(t.Number()),
          allow_yandex: t.Optional(t.Boolean()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/terminals/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("terminals.edit")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, terminals, {});
      }
      const result = await drizzle
        .update(terminals)
        .set(data)
        .where(eq(terminals.id, id))
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
          name: t.String(),
          active: t.Optional(t.Boolean()),
          phone: t.Optional(t.String()),
          address: t.Optional(t.String()),
          latitude: t.Number(),
          longitude: t.Number(),
          external_id: t.String(),
          organization_id: t.String(),
          manager_name: t.Optional(t.String()),
          fuel_bonus: t.Optional(t.Boolean()),
          linked_terminal_id: t.Optional(t.String()),
          time_to_yandex: t.Optional(t.Number()),
          allow_yandex: t.Optional(t.Boolean()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
import { order_status, organization } from "@api/drizzle/schema";
import { eq, sql, InferSelectModel, SQLWrapper } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SelectedFields } from "drizzle-orm/pg-core";
import { ctx } from "@api/src/context";
import { OrderStatusWithRelations } from "./dto/list.dto";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";

export const OrderStatusController = new Elysia({
  name: "@app/order_status",
})
  .use(ctx)
  .get(
    "/order_status",
    async ({ query: { limit, offset, sort, filters, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("order_status.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields: SelectedFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, order_status, {
          organization,
        });
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, order_status, {
          organization,
        });
      }
      const orderStatusCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(order_status)
        .execute();
      const orderStatusList = await drizzle
        .select(selectFields)
        .from(order_status)
        .leftJoin(
          organization,
          eq(order_status.organization_id, organization.id)
        )
        .limit(+limit)
        .offset(+offset)
        .execute() as OrderStatusWithRelations[];
      return {
        total: orderStatusCount[0].count,
        data: orderStatusList,
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
  .get(
    "/order_status/cached",
    async ({ redis, query: { organization_id }, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("order_status.list")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      const res = await redis.get(
        `${process.env.PROJECT_PREFIX}_order_status`
      );
      let result = JSON.parse(res || "[]") as InferSelectModel<typeof order_status>[];
      if (organization_id) {
        result = result.filter(
          (orderStatus: any) =>
            orderStatus.organization_id === organization_id
        );
      }
      return result;
    },
    {
      query: t.Object({
        organization_id: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/order_status/:id",
    async ({ params: { id }, drizzle, set, user }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("order_status.show")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      const orderStatus = await drizzle
        .select()
        .from(order_status)
        .where(eq(order_status.id, id))
        .execute();
      return {
        data: orderStatus[0],
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/order_status",
    async ({ body: { data, fields }, drizzle, user, set }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("order_status.create")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, order_status, {
          organization,
        });
      }
      const result = await drizzle
        .insert(order_status)
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
          sort: t.Number(),
          color: t.String(),
          finish: t.Optional(t.Boolean()),
          cancel: t.Optional(t.Boolean()),
          waiting: t.Optional(t.Boolean()),
          need_location: t.Optional(t.Boolean()),
          on_way: t.Optional(t.Boolean()),
          in_terminal: t.Optional(t.Boolean()),
          should_pay: t.Optional(t.Boolean()),
          yandex_delivery_statuses: t.Optional(t.String()),
          organization_id: t.String(),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .put(
    "/order_status/:id",
    async ({ params: { id }, body: { data, fields }, drizzle, set, user }) => {
      if (!user) {
        set.status = 401;
        return {
          message: "User not found",
        };
      }

      if (!user.access.additionalPermissions.includes("order_status.edit")) {
        set.status = 401;
        return {
          message: "You don't have permissions",
        };
      }
      let selectFields = {};
      if (fields) {
        selectFields = parseSelectFields(fields, order_status, {
          organization,
        });
      }
      const result = await drizzle
        .update(order_status)
        .set(data)
        .where(eq(order_status.id, id))
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
          sort: t.Number(),
          color: t.String(),
          finish: t.Optional(t.Boolean()),
          cancel: t.Optional(t.Boolean()),
          waiting: t.Optional(t.Boolean()),
          need_location: t.Optional(t.Boolean()),
          on_way: t.Optional(t.Boolean()),
          in_terminal: t.Optional(t.Boolean()),
          should_pay: t.Optional(t.Boolean()),
          yandex_delivery_statuses: t.Optional(t.String()),
          organization_id: t.Optional(t.String()),
        }),
        fields: t.Optional(t.Array(t.String())),
      }),
    }
  )

import { customers } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import Elysia, { t } from "elysia";

export const CustomersController = new Elysia({
  name: "@app/customers",
})
  .use(ctx)
  .get(
    "/customers",
    async ({ query: { limit, offset, sort, filters }, drizzle }) => {
      let selectFields: SelectedFields = {};
      if (filters) {
        selectFields = parseSelectFields(filters, customers, {});
      }
      let whereClause: (SQLWrapper | undefined)[] = [];
      if (filters) {
        whereClause = parseFilterFields(filters, customers, {});
      }
      const customersCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(and(...whereClause))
        .execute();
      const customersList = await drizzle
        .select()
        .from(customers)
        .where(and(...whereClause))
        .limit(+limit)
        .offset(+offset)
        .execute();
      return {
        total: customersCount[0].count,
        data: customersList,
      };
    },
    {
      permission: 'customers.list',
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
    "/customers/:id",
    async ({ params: { id }, drizzle }) => {
      const customer = await drizzle
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .execute();
      return {
        data: customer[0],
      };
    },
    {
      permission: 'customers.show',
      params: t.Object({
        id: t.String(),
      }),
    }
  );

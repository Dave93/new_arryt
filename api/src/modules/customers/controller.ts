import { customers } from "@api/drizzle/schema";
import { ctx } from "@api/src/context";
import { eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";

export const CustomersController = new Elysia({
  name: "@app/customers",
})
  .use(ctx)
  .get(
    "/customers",
    async ({ query: { limit, offset, sort, filter }, drizzle }) => {
      const customersCount = await drizzle
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .execute();
      const customersList = await drizzle
        .select()
        .from(customers)
        .limit(+limit)
        .offset(+offset)
        .execute();
      return {
        total: customersCount[0].count,
        data: customersList,
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
      params: t.Object({
        id: t.String(),
      }),
    }
  );

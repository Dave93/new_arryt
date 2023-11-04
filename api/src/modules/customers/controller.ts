import { customers } from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import Redis from "ioredis";

export const CustomersController = (
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
      "/api/customers",
      async ({ query: { limit, offset, sort, filter } }) => {
        const customersCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(customers)
          .execute();
        const customersList = await db
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
      "/api/customers/:id",
      async ({ params: { id } }) => {
        const customer = await db
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

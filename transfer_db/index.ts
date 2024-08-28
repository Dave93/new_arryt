import * as p from "@clack/prompts";
import color from "picocolors";
import path from "path";
import { orderBy, sortBy } from "lodash";
import fs from 'fs';
import pgCopyStreams from 'pg-copy-streams';

import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pipeline } from 'stream/promises';
import * as schema from "./drizzle/schema";
import { eq, sql } from "drizzle-orm";

const useCsvExport = process.env.CSV_EXPORT === "true";

const csvPostgresClient = postgres(process.env.DATABASE_URL!);
// for query purposes
const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, {
  schema,
});

console.clear();
p.intro(`${color.bgCyan(color.black(" Start Transfer DB "))}`);

const project = await p.group(
  {
    path: () =>
      p.text({
        message: "Please enter a path to your data.",
        placeholder: "./data",
        validate: (value) => {
          if (!value) return "Please enter a path.";
          if (value[0] !== ".") return "Please enter a relative path.";
        },
      }),
    part: () =>
      p.select({
        message: "Please select a part to transfer.",
        initialValue: "base",
        options: [
          {
            value: "base",
            title: "Base",
            hint: "Will transfer all base data",
          },
          {
            value: "orders",
            title: "Orders",
            hint: "Will transfer all orders data",
          },
          {
            value: "withdraws",
            title: "Withdraws",
            hint: "Will transfer all withdraws data",
          },
        ],
      }),
  },
  {
    onCancel: () => {
      p.cancel("Operation cancelled.");
      process.exit(0);
    },
  }
);

if (project.part) {
  let s = p.spinner();
  p.note("Starting transfer");
  let contents;
  let filePath;
  let file;
  let ordersById = {};
  let managerWithdrawById = {};
  let orderTransactionsById = {};
  if (project.part === "base") {

    s.start("Checking permissions csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/permissions.csv")
    )) {
      s.stop("permissions.csv not found");
      process.exit(0);
    } else {
      s.message("permissions.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/permissions.csv");
      const copyStream = await csvPostgresClient`COPY permissions FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted  permissions`);
    }

    s.start("Checking roles csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/roles.csv")
    )) {
      s.stop("roles.csv not found");
      process.exit(0);
    } else {
      s.message("roles.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/roles.csv");
      const copyStream = await csvPostgresClient`COPY roles FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted  roles`);
    }

    s.start("Checking roles permissions csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/roles_permissions.csv")
    )) {
      s.stop("roles_permissions.csv not found");
      process.exit(0);
    } else {
      s.message("roles_permissions.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/roles_permissions.csv");
      const copyStream = await csvPostgresClient`COPY roles_permissions FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted roles permissions`);
    }

    s.start("Checking organizations json file");
    if (
      !fs.existsSync(
        path.join(import.meta.dir, project.path, "/json/organization.json")
      )
    ) {
      s.stop("organization.json not found");
      process.exit(0);
    } else {
      s.message("organization.json found");
      filePath = path.join(import.meta.dir, project.path, "/json/organization.json");
      file = Bun.file(filePath);

      contents = await file.json();

      for (let i = 0; i < contents.length; i++) {
        let permission = contents[i];
        await db.insert(schema.organization).values(permission);
        s.message(`Inserted ${i}/${contents.length} organizations`);
      }
      s.stop(`Inserted ${contents.length} organizations`);
    }

    s.start("Checking terminals json file");
    if (
      !fs.existsSync(
        path.join(import.meta.dir, project.path, "/json/terminals.json")
      )
    ) {
      s.stop("terminals.json not found");
      process.exit(0);
    } else {
      s.message("terminals.json found");
      filePath = path.join(import.meta.dir, project.path, "/json/terminals.json");
      file = Bun.file(filePath);

      contents = await file.json();

      // sort by linked_terminal_id
      contents = orderBy(contents, ["linked_terminal_id"], ["desc"]);

      for (let i = 0; i < contents.length; i++) {
        let permission = contents[i];
        await db
          .insert(schema.terminals)
          .values({ ...permission, linked_terminal_id: null });
        s.message(`Inserted ${i}/${contents.length} terminals`);
      }

      contents
        .filter((terminal) => terminal.linked_terminal_id)
        .forEach(async (terminal) => {
          await db
            .update(schema.terminals)
            .set({ linked_terminal_id: terminal.linked_terminal_id })
            .where(eq(schema.terminals.id, terminal.id));
        });
      s.stop(`Inserted ${contents.length} terminals`);
    }

    s.start("Checking daily_garant json file");
    if (
      !fs.existsSync(
        path.join(import.meta.dir, project.path, "/json/daily_garant.json")
      )
    ) {
      s.stop("daily_garant.json not found");
      process.exit(0);
    } else {
      s.message("daily_garant.json found");
      filePath = path.join(import.meta.dir, project.path, "/json/daily_garant.json");
      file = Bun.file(filePath);

      contents = await file.json();

      for (let i = 0; i < contents.length; i++) {
        let permission = contents[i];
        await db.insert(schema.daily_garant).values(permission);
        s.message(`Inserted ${i}/${contents.length} daily_garant`);
      }
      s.stop(`Inserted ${contents.length} daily_garant`);
    }

    s.start("Checking users json file");
    if (
      !fs.existsSync(path.join(import.meta.dir, project.path, "/json/users.json"))
    ) {
      s.stop("users.json not found");
      process.exit(0);
    } else {
      s.message("users.json found");
      filePath = path.join(import.meta.dir, project.path, "/json/users.json");
      file = Bun.file(filePath);

      contents = await file.json();

      for (let i = 0; i < contents.length; i++) {
        let permission = contents[i];
        try {
          await db.insert(schema.users).values(permission);
          s.message(`Inserted ${i}/${contents.length} users`);
        } catch (e) {
          p.note("Could not insert user: " + JSON.stringify(permission) + " " + e);
          process.exit(0);
        }
      }
      s.stop(`Inserted ${contents.length} users`);
    }


    s.start("Checking users_terminals csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/users_terminals.csv")
    )) {
      s.stop("users_terminals.csv not found");
      process.exit(0);
    } else {
      s.message("users_terminals.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/users_terminals.csv");
      const copyStream = await csvPostgresClient`COPY users_terminals FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted users_terminals`);
    }


    s.start("Checking users_roles csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/users_roles.csv")
    )) {
      s.stop("users_roles.csv not found");
      process.exit(0);
    } else {
      s.message("users_roles.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/users_roles.csv");
      const copyStream = await csvPostgresClient`COPY users_roles FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted users_roles`);
    }


    s.start("Checking work_schedules csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/work_schedules.csv")
    )) {
      s.stop("work_schedules.csv not found");
      process.exit(0);
    } else {
      s.message("work_schedules.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/work_schedules.csv");
      const copyStream = await csvPostgresClient`COPY work_schedules FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted work_schedules`);
    }


    s.start("Checking users_work_schedules csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/users_work_schedules.csv")
    )) {
      s.stop("users_work_schedules.csv not found");
      process.exit(0);
    } else {
      s.message("users_work_schedules.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/users_work_schedules.csv");
      const copyStream = await csvPostgresClient`COPY users_work_schedules FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted users_work_schedules`);
    }


    s.start("Checking work_schedule_entries csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/work_schedule_entries.csv")
    )) {
      s.stop("work_schedule_entries.csv not found");
      process.exit(0);
    } else {
      s.message("work_schedule_entries.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/work_schedule_entries.csv");
      const copyStream = await csvPostgresClient`COPY work_schedule_entries FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted work_schedule_entries`);
    }


    s.start("Checking timesheet csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/timesheet.csv")
    )) {
      s.stop("timesheet.csv not found");
      process.exit(0);
    } else {
      s.message("timesheet.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/timesheet.csv");
      const copyStream = await csvPostgresClient`COPY timesheet FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted timesheet`);
    }



    s.start("Checking system_configs csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/system_configs.csv")
    )) {
      s.stop("system_configs.csv not found");
      process.exit(0);
    } else {
      s.message("system_configs.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/system_configs.csv");
      const copyStream = await csvPostgresClient`COPY system_configs FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted system_configs`);
    }


    s.start("Checking scheduled_reports csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/scheduled_reports.csv")
    )) {
      s.stop("scheduled_reports.csv not found");
      process.exit(0);
    } else {
      s.message("scheduled_reports.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/scheduled_reports.csv");
      const copyStream = await csvPostgresClient`COPY scheduled_reports FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted scheduled_reports`);
    }


    s.start("Checking scheduled_reports_subscription csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/scheduled_reports_subscription.csv")
    )) {
      s.stop("scheduled_reports_subscription.csv not found");
      process.exit(0);
    } else {
      s.message("scheduled_reports_subscription.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/scheduled_reports_subscription.csv");
      const copyStream = await csvPostgresClient`COPY scheduled_reports_subscription FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted scheduled_reports_subscription`);
    }


    s.start("Checking otp csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/otp.csv")
    )) {
      s.stop("otp.csv not found");
      process.exit(0);
    } else {
      s.message("otp.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/otp.csv");
      const copyStream = await csvPostgresClient`COPY otp FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted otp`);
    }


    s.start("Checking api_tokens csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/api_tokens.csv")
    )) {
      s.stop("api_tokens.csv not found");
      process.exit(0);
    } else {
      s.message("api_tokens.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/api_tokens.csv");
      const copyStream = await csvPostgresClient`COPY api_tokens FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted api_tokens`);
    }



    s.start("Checking assets csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/assets.csv")
    )) {
      s.stop("assets.csv not found");
      process.exit(0);
    } else {
      s.message("assets.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/assets.csv");
      const copyStream = await csvPostgresClient`COPY assets FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted assets`);
    }


    s.start("Checking brands csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/brands.csv")
    )) {
      s.stop("brands.csv not found");
      process.exit(0);
    } else {
      s.message("brands.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/brands.csv");
      const copyStream = await csvPostgresClient`COPY brands FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted brands`);
    }


    //   s.start("Checking constructed_bonus_pricing json file");
    //   if (
    //     !fs.existsSync(
    //       path.join(
    //         import.meta.dir,
    //         project.path,
    //         "/constructed_bonus_pricing.json"
    //       )
    //     )
    //   ) {
    //     s.stop("constructed_bonus_pricing.json not found");
    //     process.exit(0);
    //   } else {
    //     s.message("constructed_bonus_pricing.json found");
    //     filePath = path.join(
    //       import.meta.dir,
    //       project.path,
    //       "/constructed_bonus_pricing.json"
    //     );
    //     file = Bun.file(filePath);

    //     contents = await file.json();

    //     for (let i = 0; i < contents.length; i++) {
    //       let permission = contents[i];
    //       await db.insert(schema.constructed_bonus_pricing).values(permission);
    //       s.message(`Inserted ${i}/${contents.length} constructed_bonus_pricing`);
    //     }
    //     s.stop(`Inserted ${contents.length} constructed_bonus_pricing`);
    //   }

    s.start("Checking customers csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/customers.csv")
    )) {
      s.stop("customers.csv not found");
      process.exit(0);
    } else {
      s.message("customers.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/customers.csv");
      const copyStream = await csvPostgresClient`COPY customers FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted  customers`);
    }


    s.start("Checking customers_comments csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/customers_comments.csv")
    )) {
      s.stop("customers_comments.csv not found");
      process.exit(0);
    } else {
      s.message("customers_comments.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/customers_comments.csv");
      const copyStream = await csvPostgresClient`COPY customers_comments FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted  customers_comments`);
    }


    s.start("Checking daily_garant_tasks csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/daily_garant_tasks.csv")
    )) {
      s.stop("daily_garant_tasks.csv not found");
      process.exit(0);
    } else {
      s.message("daily_garant_tasks.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/daily_garant_tasks.csv");
      const copyStream = await csvPostgresClient`COPY daily_garant_tasks FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted  daily_garant_tasks`);
    }


    s.start("Checking delivery_pricing csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/delivery_pricing.csv")
    )) {
      s.stop("delivery_pricing.csv not found");
      process.exit(0);
    } else {
      s.message("delivery_pricing.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/delivery_pricing.csv");
      const copyStream = await csvPostgresClient`COPY delivery_pricing FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted  delivery_pricing`);
    }


    s.start("Checking order_status csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/order_status.csv")
    )) {
      s.stop("order_status.csv not found");
      process.exit(0);
    } else {
      s.message("order_status.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/order_status.csv");
      const copyStream = await csvPostgresClient`COPY order_status FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted  order_status`);
    }

    s.start("Checking order_bonus_pricing csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/order_bonus_pricing.csv")
    )) {
      s.stop("order_bonus_pricing.csv not found");
      process.exit(0);
    } else {
      s.message("order_bonus_pricing.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/order_bonus_pricing.csv");
      const copyStream = await csvPostgresClient`COPY order_bonus_pricing FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted  order_bonus_pricing`);
    }
  }

  if (project.part === "orders") {
    s.start("Checking orders json file");
    if (
      !fs.existsSync(path.join(import.meta.dir, project.path, "/json/orders.json"))
    ) {
      s.stop("orders.json not found");
      process.exit(0);
    } else {
      s.message("orders.json found");
      filePath = path.join(import.meta.dir, project.path, "/json/orders.json");
      file = Bun.file(filePath);

      contents = await file.json();

      for (let i = 0; i < contents.length; i++) {
        let permission = contents[i];
        ordersById[permission.id] = {
          id: permission.id,
          created_at: permission.created_at,
        };
        const newOrder = await db
          .insert(schema.orders)
          .values({
            ...permission,
            order_items: null,
          })
          .returning({
            id: schema.orders.id,
            created_at: schema.orders.created_at,
          });
        try {
          const orderItems = JSON.parse(permission.order_items);
          if (orderItems && orderItems.length > 0) {
            try {
              await db.insert(schema.order_items).values(
                orderItems.map((item) => ({
                  product_id: item.productId,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                  order_id: newOrder[0].id,
                  order_created_at: newOrder[0].created_at,
                }))
              );
            } catch (e) {
              orderItems.map((item) => {
                console.log("adding data", {
                  product_id: item.productId,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                  order_id: newOrder[0].id,
                  order_created_at: newOrder[0].created_at,
                });
              });
            }
          }
        } catch (e) {
          console.log(e);
          process.exit(0);
        }
        s.message(`Inserted ${i}/${contents.length} orders`);
      }
      s.stop(`Inserted ${contents.length} orders`);
    }

    s.start("Checking order_transactions csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/order_transactions.csv")
    )) {
      s.stop("order_transactions.csv not found");
      process.exit(0);
    } else {
      s.message("order_transactions.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/order_transactions.csv");
      const copyStream = await csvPostgresClient`COPY order_transactions FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted order_transactions`);
    }

    s.start("Checking order_actions json file");
    if (
      !fs.existsSync(
        path.join(import.meta.dir, project.path, "/json/order_actions.json")
      )
    ) {
      s.stop("order_actions.json not found");
      process.exit(0);
    } else {
      s.message("order_actions.json found");
      filePath = path.join(
        import.meta.dir,
        project.path,
        "/json/order_actions.json"
      );
      file = Bun.file(filePath);

      contents = await file.json();

      for (let i = 0; i < contents.length; i++) {
        let permission = contents[i];
        let order = ordersById[permission.order_id];
        await db.insert(schema.order_actions).values({
          ...permission,
          order_created_at: order.created_at,
        });
        s.message(`Inserted ${i}/${contents.length} order_actions`);
      }
      s.stop(`Inserted ${contents.length} order_actions`);
    }
  }

  if (project.part === "withdraws") {
    s.start("Checking courier_terminal_balance csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/courier_terminal_balance.csv")
    )) {
      s.stop("courier_terminal_balance.csv not found");
      process.exit(0);
    } else {
      s.message("courier_terminal_balance.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/courier_terminal_balance.csv");
      const copyStream = await csvPostgresClient`COPY courier_terminal_balance FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted courier_terminal_balance`);
    }

    s.start("Checking manager_withdraw csv file");

    if (!fs.existsSync(
      path.join(import.meta.dir, project.path, "/csv/manager_withdraw.csv")
    )) {
      s.stop("manager_withdraw.csv not found");
      process.exit(0);
    } else {
      s.message("manager_withdraw.csv found");
      filePath = path.join(import.meta.dir, project.path, "/csv/manager_withdraw.csv");
      const copyStream = await csvPostgresClient`COPY manager_withdraw FROM STDIN WITH CSV HEADER`.writable();

      await pipeline(fs.createReadStream(filePath), copyStream);
      s.stop(`Inserted manager_withdraw`);
    }

    // s.start("Checking manager_withdraw_transactions json file");
    // if (
    //   !fs.existsSync(
    //     path.join(
    //       import.meta.dir,
    //       project.path,
    //       "/json/manager_withdraw_transactions.json"
    //     )
    //   )
    // ) {
    //   s.stop("manager_withdraw_transactions.json not found");
    //   process.exit(0);
    // } else {
    //   s.message("manager_withdraw_transactions.json found");
    //   filePath = path.join(
    //     import.meta.dir,
    //     project.path,
    //     "/json/manager_withdraw_transactions.json"
    //   );
    //   file = Bun.file(filePath);

    //   contents = await file.json();

    //   let orderTransactionFilePath = path.join(
    //     import.meta.dir,
    //     project.path,
    //     "/json/order_transactions.json"
    //   );
    //   let orderTransactionFile = Bun.file(orderTransactionFilePath);

    //   let orderTransactionContents = await orderTransactionFile.json();

    //   let orderTransactionsById = {};

    //   for (let i = 0; i < orderTransactionContents.length; i++) {
    //     let permission = orderTransactionContents[i];
    //     orderTransactionsById[permission.id] = permission;
    //   }

    //   for (let i = 0; i < contents.length; i++) {
    //     let permission = contents[i];
    //     let orderTransaction = orderTransactionsById[permission.transaction_id];
    //     await db.insert(schema.manager_withdraw_transactions).values({
    //       ...permission,
    //       transaction_created_at: orderTransaction.created_at,
    //     });
    //     s.message(
    //       `Inserted ${i}/${contents.length} manager_withdraw_transactions`
    //     );
    //   }
    //   s.stop(`Inserted ${contents.length} manager_withdraw_transactions`);
    // }
  }

  //   queryClient.END;
  //   await new Promise((resolve) => setTimeout(resolve, 2000));
  p.note("Finished transfer");
  process.exit(0);
}

import * as p from "@clack/prompts";
import color from "picocolors";
import fs from "fs";
import path from "path";
import { orderBy, sortBy } from "lodash";

import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./drizzle/schema";
import { eq } from "drizzle-orm";

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
    start: () =>
      p.confirm({
        message: "Start Transfer? ",
        initialValue: false,
      }),
  },
  {
    onCancel: () => {
      p.cancel("Operation cancelled.");
      process.exit(0);
    },
  }
);

if (project.start) {
  let s = p.spinner();
  p.note("Starting transfer");
  let contents;
  let filePath;
  let file;
  let ordersById = {};
  let managerWithdrawById = {};
  s.start("Checking permissions json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/permissions.json")
    )
  ) {
    s.stop("permissions.json not found");
    process.exit(0);
  } else {
    s.message("permissions.json found");
    filePath = path.join(import.meta.dir, project.path, "/permissions.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.permissions).values(permission);
      s.message(`Inserted ${i}/${contents.length} permissions`);
    }
    s.stop(`Inserted ${contents.length} permissions`);
  }

  s.start("Checking roles json file");
  if (!fs.existsSync(path.join(import.meta.dir, project.path, "/roles.json"))) {
    s.stop("roles.json not found");
    process.exit(0);
  } else {
    s.message("roles.json found");
    filePath = path.join(import.meta.dir, project.path, "/roles.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.roles).values(permission);
      s.message(`Inserted ${i}/${contents.length} roles`);
    }
    s.stop(`Inserted ${contents.length} roles`);
  }

  s.start("Checking roles permissions json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/roles_permissions.json")
    )
  ) {
    s.stop("roles_permissions.json not found");
    process.exit(0);
  } else {
    s.message("roles_permissions.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/roles_permissions.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.roles_permissions).values(permission);
      s.message(`Inserted ${i}/${contents.length} roles_permissions`);
    }
    s.stop(`Inserted ${contents.length} roles_permissions`);
  }

  s.start("Checking organizations json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/organization.json")
    )
  ) {
    s.stop("organization.json not found");
    process.exit(0);
  } else {
    s.message("organization.json found");
    filePath = path.join(import.meta.dir, project.path, "/organization.json");
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
    !fs.existsSync(path.join(import.meta.dir, project.path, "/terminals.json"))
  ) {
    s.stop("terminals.json not found");
    process.exit(0);
  } else {
    s.message("terminals.json found");
    filePath = path.join(import.meta.dir, project.path, "/terminals.json");
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
      path.join(import.meta.dir, project.path, "/daily_garant.json")
    )
  ) {
    s.stop("daily_garant.json not found");
    process.exit(0);
  } else {
    s.message("daily_garant.json found");
    filePath = path.join(import.meta.dir, project.path, "/daily_garant.json");
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
  if (!fs.existsSync(path.join(import.meta.dir, project.path, "/users.json"))) {
    s.stop("users.json not found");
    process.exit(0);
  } else {
    s.message("users.json found");
    filePath = path.join(import.meta.dir, project.path, "/users.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      try {
        await db.insert(schema.users).values(permission);
        s.message(`Inserted ${i}/${contents.length} users`);
      } catch (e) {
        p.note("Could not insert user: " + JSON.stringify(permission));
        process.exit(0);
      }
    }
    s.stop(`Inserted ${contents.length} users`);
  }

  s.start("Checking users terminals json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/users_terminals.json")
    )
  ) {
    s.stop("users_terminals.json not found");
    process.exit(0);
  } else {
    s.message("users_terminals.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/users_terminals.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.users_terminals).values(permission);
      s.message(`Inserted ${i}/${contents.length} users_terminals`);
    }
    s.stop(`Inserted ${contents.length} users_terminals`);
  }

  s.start("Checking users roles json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/users_roles.json")
    )
  ) {
    s.stop("users_roles.json not found");
    process.exit(0);
  } else {
    s.message("users_roles.json found");
    filePath = path.join(import.meta.dir, project.path, "/users_roles.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.users_roles).values(permission);
      s.message(`Inserted ${i}/${contents.length} users_roles`);
    }
    s.stop(`Inserted ${contents.length} users_roles`);
  }

  s.start("Checking work_schedules json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/work_schedules.json")
    )
  ) {
    s.stop("work_schedules.json not found");
    process.exit(0);
  } else {
    s.message("work_schedules.json found");
    filePath = path.join(import.meta.dir, project.path, "/work_schedules.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.work_schedules).values(permission);
      s.message(`Inserted ${i}/${contents.length} work_schedules`);
    }
    s.stop(`Inserted ${contents.length} work_schedules`);
  }

  s.start("Checking users_work_schedules json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/users_work_schedules.json")
    )
  ) {
    s.stop("users_work_schedules.json not found");
    process.exit(0);
  } else {
    s.message("users_work_schedules.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/users_work_schedules.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      try {
        await db.insert(schema.users_work_schedules).values(permission);
        s.message(`Inserted ${i}/${contents.length} users_work_schedules`);
      } catch (e) {
        p.note(
          "Could not insert users_work_schedules: " + JSON.stringify(permission)
        );
        process.exit(0);
      }
    }
    s.stop(`Inserted ${contents.length} users_work_schedules`);
  }

  s.start("Checking work_schedule_entries json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/work_schedule_entries.json")
    )
  ) {
    s.stop("work_schedule_entries.json not found");
    process.exit(0);
  } else {
    s.message("work_schedule_entries.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/work_schedule_entries.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.work_schedule_entries).values(permission);
      s.message(`Inserted ${i}/${contents.length} work_schedule_entries`);
    }
    s.stop(`Inserted ${contents.length} work_schedule_entries`);
  }

  s.start("Checking timesheet file");
  if (
    !fs.existsSync(path.join(import.meta.dir, project.path, "/timesheet.json"))
  ) {
    s.stop("timesheet.json not found");
    process.exit(0);
  } else {
    s.message("timesheet.json found");
    filePath = path.join(import.meta.dir, project.path, "/timesheet.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.timesheet).values(permission);
      s.message(`Inserted ${i}/${contents.length} timesheet`);
    }
    s.stop(`Inserted ${contents.length} timesheet`);
  }

  s.start("Checking system_configs json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/system_configs.json")
    )
  ) {
    s.stop("system_configs.json not found");
    process.exit(0);
  } else {
    s.message("system_configs.json found");
    filePath = path.join(import.meta.dir, project.path, "/system_configs.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.system_configs).values(permission);
      s.message(`Inserted ${i}/${contents.length} system_configs`);
    }
    s.stop(`Inserted ${contents.length} system_configs`);
  }

  s.start("Checking scheduled_reports json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/scheduled_reports.json")
    )
  ) {
    s.stop("scheduled_reports.json not found");
    process.exit(0);
  } else {
    s.message("scheduled_reports.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/scheduled_reports.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.scheduled_reports).values(permission);
      s.message(`Inserted ${i}/${contents.length} scheduled_reports`);
    }
    s.stop(`Inserted ${contents.length} scheduled_reports`);
  }

  s.start("Checking scheduled_reports_subscription json file");
  if (
    !fs.existsSync(
      path.join(
        import.meta.dir,
        project.path,
        "/scheduled_reports_subscription.json"
      )
    )
  ) {
    s.stop("scheduled_reports_subscription.json not found");
    process.exit(0);
  } else {
    s.message("scheduled_reports_subscription.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/scheduled_reports_subscription.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.scheduled_reports_subscription).values(permission);
      s.message(
        `Inserted ${i}/${contents.length} scheduled_reports_subscription`
      );
    }
    s.stop(`Inserted ${contents.length} scheduled_reports_subscription`);
  }

  s.start("Checking otp json file");
  if (!fs.existsSync(path.join(import.meta.dir, project.path, "/otp.json"))) {
    s.stop("otp.json not found");
    process.exit(0);
  } else {
    s.message("otp.json found");
    filePath = path.join(import.meta.dir, project.path, "/otp.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.otp).values(permission);
      s.message(`Inserted ${i}/${contents.length} otp`);
    }
    s.stop(`Inserted ${contents.length} otp`);
  }

  s.start("Checking api_tokens json file");
  if (
    !fs.existsSync(path.join(import.meta.dir, project.path, "/api_tokens.json"))
  ) {
    s.stop("api_tokens.json not found");
    process.exit(0);
  } else {
    s.message("api_tokens.json found");
    filePath = path.join(import.meta.dir, project.path, "/api_tokens.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.api_tokens).values(permission);
      s.message(`Inserted ${i}/${contents.length} api_tokens`);
    }
    s.stop(`Inserted ${contents.length} api_tokens`);
  }

  s.start("Checking assets json file");
  if (
    !fs.existsSync(path.join(import.meta.dir, project.path, "/assets.json"))
  ) {
    s.stop("assets.json not found");
    process.exit(0);
  } else {
    s.message("assets.json found");
    filePath = path.join(import.meta.dir, project.path, "/assets.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.assets).values(permission);
      s.message(`Inserted ${i}/${contents.length} assets`);
    }
    s.stop(`Inserted ${contents.length} assets`);
  }

  s.start("Checking brands json file");
  if (
    !fs.existsSync(path.join(import.meta.dir, project.path, "/brands.json"))
  ) {
    s.stop("brands.json not found");
    process.exit(0);
  } else {
    s.message("brands.json found");
    filePath = path.join(import.meta.dir, project.path, "/brands.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.brands).values(permission);
      s.message(`Inserted ${i}/${contents.length} brands`);
    }
    s.stop(`Inserted ${contents.length} brands`);
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

  s.start("Checking customers json file");
  if (
    !fs.existsSync(path.join(import.meta.dir, project.path, "/customers.json"))
  ) {
    s.stop("customers.json not found");
    process.exit(0);
  } else {
    s.message("customers.json found");
    filePath = path.join(import.meta.dir, project.path, "/customers.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.customers).values(permission);
      s.message(`Inserted ${i}/${contents.length} customers`);
    }
    s.stop(`Inserted ${contents.length} customers`);
  }

  s.start("Checking customers_comments json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/customers_comments.json")
    )
  ) {
    s.stop("customers_comments.json not found");
    process.exit(0);
  } else {
    s.message("customers_comments.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/customers_comments.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.customers_comments).values(permission);
      s.message(`Inserted ${i}/${contents.length} customers_comments`);
    }
    s.stop(`Inserted ${contents.length} customers_comments`);
  }

  s.start("Checking daily_garant_tasks json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/daily_garant_tasks.json")
    )
  ) {
    s.stop("daily_garant_tasks.json not found");
    process.exit(0);
  } else {
    s.message("daily_garant_tasks.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/daily_garant_tasks.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.daily_garant_tasks).values(permission);
      s.message(`Inserted ${i}/${contents.length} daily_garant_tasks`);
    }
    s.stop(`Inserted ${contents.length} daily_garant_tasks`);
  }

  s.start("Checking delivery_pricing json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/delivery_pricing.json")
    )
  ) {
    s.stop("delivery_pricing.json not found");
    process.exit(0);
  } else {
    s.message("delivery_pricing.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/delivery_pricing.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.delivery_pricing).values(permission);
      s.message(`Inserted ${i}/${contents.length} delivery_pricing`);
    }
    s.stop(`Inserted ${contents.length} delivery_pricing`);
  }

  s.start("Checking order_status json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/order_status.json")
    )
  ) {
    s.stop("order_status.json not found");
    process.exit(0);
  } else {
    s.message("order_status.json found");
    filePath = path.join(import.meta.dir, project.path, "/order_status.json");
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.order_status).values(permission);
      s.message(`Inserted ${i}/${contents.length} order_status`);
    }
    s.stop(`Inserted ${contents.length} order_status`);
  }

  s.start("Checking orders json file");
  if (
    !fs.existsSync(path.join(import.meta.dir, project.path, "/orders.json"))
  ) {
    s.stop("orders.json not found");
    process.exit(0);
  } else {
    s.message("orders.json found");
    filePath = path.join(import.meta.dir, project.path, "/orders.json");
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

  s.start("Checking order_transactions json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/order_transactions.json")
    )
  ) {
    s.stop("order_transactions.json not found");
    process.exit(0);
  } else {
    s.message("order_transactions.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/order_transactions.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      let order = ordersById[permission.order_id];
      try {
        await db.insert(schema.order_transactions).values({
          ...permission,
        });
      } catch (e) {
        console.log("adding data", {
          ...permission,
        });
        console.log(e);
        process.exit(0);
      }
      s.message(`Inserted ${i}/${contents.length} order_transactions`);
    }
    s.stop(`Inserted ${contents.length} order_transactions`);
  }

  s.start("Checking order_actions json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/order_actions.json")
    )
  ) {
    s.stop("order_actions.json not found");
    process.exit(0);
  } else {
    s.message("order_actions.json found");
    filePath = path.join(import.meta.dir, project.path, "/order_actions.json");
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

  s.start("Checking courier_terminal_balance json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/courier_terminal_balance.json")
    )
  ) {
    s.stop("courier_terminal_balance.json not found");
    process.exit(0);
  } else {
    s.message("courier_terminal_balance.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/courier_terminal_balance.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.courier_terminal_balance).values({
        ...permission,
      });
      s.message(`Inserted ${i}/${contents.length} courier_terminal_balance`);
    }
    s.stop(`Inserted ${contents.length} courier_terminal_balance`);
  }

  s.start("Checking manager_withdraw json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/manager_withdraw.json")
    )
  ) {
    s.stop("manager_withdraw.json not found");
    process.exit(0);
  } else {
    s.message("manager_withdraw.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/manager_withdraw.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      managerWithdrawById[permission.id] = permission;
      await db.insert(schema.manager_withdraw).values({
        ...permission,
      });
      s.message(`Inserted ${i}/${contents.length} manager_withdraw`);
    }
    s.stop(`Inserted ${contents.length} manager_withdraw`);
  }

  s.start("Checking manager_withdraw_transactions json file");
  if (
    !fs.existsSync(
      path.join(
        import.meta.dir,
        project.path,
        "/manager_withdraw_transactions.json"
      )
    )
  ) {
    s.stop("manager_withdraw_transactions.json not found");
    process.exit(0);
  } else {
    s.message("manager_withdraw_transactions.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/manager_withdraw_transactions.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      let managerWithdraw = managerWithdrawById[permission.withdraw_id];
      await db.insert(schema.manager_withdraw_transactions).values({
        ...permission,
        transaction_created_at: managerWithdraw.created_at,
      });
      s.message(
        `Inserted ${i}/${contents.length} manager_withdraw_transactions`
      );
    }
    s.stop(`Inserted ${contents.length} manager_withdraw_transactions`);
  }

  s.start("Checking order_bonus_pricing json file");
  if (
    !fs.existsSync(
      path.join(import.meta.dir, project.path, "/order_bonus_pricing.json")
    )
  ) {
    s.stop("order_bonus_pricing.json not found");
    process.exit(0);
  } else {
    s.message("order_bonus_pricing.json found");
    filePath = path.join(
      import.meta.dir,
      project.path,
      "/order_bonus_pricing.json"
    );
    file = Bun.file(filePath);

    contents = await file.json();

    for (let i = 0; i < contents.length; i++) {
      let permission = contents[i];
      await db.insert(schema.order_bonus_pricing).values({
        ...permission,
      });
      s.message(`Inserted ${i}/${contents.length} order_bonus_pricing`);
    }
    s.stop(`Inserted ${contents.length} order_bonus_pricing`);
  }

  //   queryClient.END;
  //   await new Promise((resolve) => setTimeout(resolve, 2000));
  p.note("Finished transfer");
  process.exit(0);
}

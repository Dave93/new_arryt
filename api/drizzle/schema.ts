import {
    pgTable,
    pgEnum,
    uuid,
    bigint,
    varchar,
    uniqueIndex,
    foreignKey,
    boolean,
    timestamp,
    text,
    doublePrecision,
    integer,
    index,
    time,
    jsonb,
    primaryKey,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
export const order_transaction_payment_type = pgEnum(
    "order_transaction_payment_type",
    ["card", "cash"]
);
export const order_transaction_status = pgEnum("order_transaction_status", [
    "failed",
    "success",
    "pending",
]);
export const organization_payment_types = pgEnum("organization_payment_types", [
    "client",
    "card",
    "cash",
]);
export const organization_system_type = pgEnum("organization_system_type", [
    "jowi",
    "r_keeper",
    "iiko",
]);
export const drive_type = pgEnum("drive_type", [
    "bycicle",
    "foot",
    "bike",
    "car",
]);
export const user_status = pgEnum("user_status", [
    "inactive",
    "blocked",
    "active",
]);
export const price_type = pgEnum("price_type", ["perMonth", "fixed"]);
export const status = pgEnum("status", ["archived", "published", "draft"]);
export const sale_type = pgEnum("sale_type", ["new_building", "rent", "buy"]);
export const type = pgEnum("type", [
    "json",
    "enum",
    "datetime",
    "date",
    "boolean",
    "float",
    "integer",
    "string",
]);
export const work_schedule_entry_status = pgEnum("work_schedule_entry_status", [
    "closed",
    "open",
]);

export const migrations = pgTable("migrations", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    timestamp: bigint("timestamp", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
});

export const permissions = pgTable(
    "permissions",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        slug: varchar("slug", { length: 160 }).notNull(),
        description: varchar("description", { length: 60 }).notNull(),
        active: boolean("active").default(true).notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            UQ_d090ad82a0e97ce764c06c7b312: uniqueIndex(
                "UQ_d090ad82a0e97ce764c06c7b312"
            ).on(table.slug),
        };
    }
);

export const roles = pgTable(
    "roles",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        name: varchar("name", { length: 50 }).notNull(),
        code: varchar("code", { length: 50 }),
        active: boolean("active").default(true).notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            UQ_648e3f5447f725579d7d4ffdfb7: uniqueIndex(
                "UQ_648e3f5447f725579d7d4ffdfb7"
            ).on(table.name),
            UQ_0e2c0e1b4b0b0b0b0b0b0b0b0b0: uniqueIndex(
                "UQ_0e2c0e1b4b0b0b0b0b0b0b0b0b0"
            ).on(table.code),
        };
    }
);

export const typeorm_metadata = pgTable("typeorm_metadata", {
    type: varchar("type").notNull(),
    database: varchar("database"),
    schema: varchar("schema"),
    table: varchar("table"),
    name: varchar("name"),
    value: text("value"),
});

export const users = pgTable(
    "users",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        phone: varchar("phone", { length: 20 }).notNull(),
        first_name: varchar("first_name", { length: 100 }),
        last_name: varchar("last_name", { length: 100 }),
        password: varchar("password", { length: 100 }),
        is_super_user: boolean("is_super_user").default(false).notNull(),
        status: user_status("status").notNull(),
        drive_type: drive_type("drive_type"),
        card_name: varchar("card_name", { length: 100 }),
        card_number: varchar("card_number", { length: 100 }),
        birth_date: timestamp("birth_date", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }),
        car_model: varchar("car_model", { length: 100 }),
        car_number: varchar("car_number", { length: 100 }),
        is_online: boolean("is_online").default(false).notNull(),
        latitude: doublePrecision("latitude"),
        longitude: doublePrecision("longitude"),
        fcm_token: varchar("fcm_token", { length: 250 }),
        wallet_balance: doublePrecision("wallet_balance").notNull().default(0),
        max_active_order_count: integer("max_active_order_count"),
        doc_files: text("doc_files").array(),
        order_start_date: timestamp("order_start_date", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }),
        app_version: varchar("app_version", { length: 100 }),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        api_token: varchar("api_token", { length: 250 }),
        tg_id: varchar("tg_id", { length: 250 }),
        daily_garant_id: uuid("daily_garant_id").references(() => daily_garant.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            UQ_a000cca60bcf04454e727699490: uniqueIndex(
                "UQ_a000cca60bcf04454e727699490"
            ).on(table.phone),
        };
    }
);

export const city = pgTable(
    "city",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        name: varchar("name", { length: 255 }).notNull(),
        parent_id: uuid("parent_id"),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            fki_FK_city_created_by: index("fki_FK_city_created_by").on(
                table.created_by
            ),
            fki_FK_city_updated_by: index("fki_FK_city_updated_by").on(
                table.updated_by
            ),
            FK_city_parent_id: foreignKey({
                columns: [table.parent_id],
                foreignColumns: [table.id],
            }).onUpdate("cascade"),
        };
    }
);

export const post = pgTable(
    "post",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        price: integer("price").default(0).notNull(),
        price_type: price_type("price_type").default("fixed").notNull(),
        status: status("status").default("draft").notNull(),
        sale_type: sale_type("sale_type").default("buy").notNull(),
        latitude: doublePrecision("latitude").notNull(),
        longitude: doublePrecision("longitude").notNull(),
        address: text("address").default("").notNull(),
        comments_count: integer("comments_count").default(0).notNull(),
        city_id: uuid("city_id")
            .notNull()
            .references(() => city.id, { onUpdate: "cascade" }),
    },
    (table) => {
        return {
            fki_FK_post_created_by: index("fki_FK_post_created_by").on(
                table.created_by
            ),
            fki_FK_post_updated_by: index("fki_FK_post_updated_by").on(
                table.updated_by
            ),
        };
    }
);

export const post_prop_types = pgTable(
    "post_prop_types",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        sale_type: sale_type("sale_type").default("buy").notNull(),
        name: text("name").notNull(),
        type: type("type").default("string").notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            fki_FK_post_prop_types_created_by: index(
                "fki_FK_post_prop_types_created_by"
            ).on(table.created_by),
        };
    }
);

export const delivery_pricing = pgTable(
    "delivery_pricing",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        active: boolean("active").default(true).notNull(),
        default: boolean("default").default(false).notNull(),
        name: text("name").notNull(),
        drive_type: drive_type("drive_type").default("car").notNull(),
        days: text("days").array(),
        start_time: time("start_time").notNull(),
        end_time: time("end_time").notNull(),
        min_price: integer("min_price"),
        rules: jsonb("rules").$type<{
            from: number;
            price: number;
            to: number;
        }[]>().notNull(),
        price_per_km: integer("price_per_km").default(0).notNull(),
        customer_rules: jsonb("customer_rules").$type<{
            from: number;
            price: number;
            to: number;
        }[]>(),
        customer_price_per_km: integer("customer_price_per_km")
            .default(0)
            .notNull(),
        min_distance_km: integer("min_distance_km").default(0).notNull(),
        organization_id: uuid("organization_id")
            .notNull()
            .references(() => organization.id, { onUpdate: "cascade" }),
        terminal_id: uuid("terminal_id").references(() => terminals.id, {
            onUpdate: "cascade",
        }),
        payment_type: organization_payment_types("payment_type").default("client"),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            fki_FK_delivery_pricing_created_by: index(
                "fki_FK_delivery_pricing_created_by"
            ).on(table.created_by),
            fki_FK_delivery_pricing_updated_by: index(
                "fki_FK_delivery_pricing_updated_by"
            ).on(table.updated_by),
        };
    }
);

export const order_bonus_pricing = pgTable(
    "order_bonus_pricing",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        active: boolean("active").default(true).notNull(),
        name: text("name").notNull(),
        max_order_time: integer("max_order_time").default(20).notNull(),
        rules: jsonb("rules").notNull(),
        min_distance_km: integer("min_distance_km").default(0).notNull(),
        organization_id: uuid("organization_id")
            .notNull()
            .references(() => organization.id, {
                onDelete: "restrict",
                onUpdate: "cascade",
            }),
        terminal_id: uuid("terminal_id").references(() => terminals.id, {
            onDelete: "set null",
            onUpdate: "cascade",
        }),
        terminal_ids: text("terminal_ids").array(),
        courier_id: uuid("courier_id").references(() => users.id, {
            onUpdate: "cascade",
        }),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            fki_FK_order_bonus_pricing_created_by: index(
                "fki_FK_order_bonus_pricing_created_by"
            ).on(table.created_by),
            fki_FK_order_bonus_pricing_updated_by: index(
                "fki_FK_order_bonus_pricing_updated_by"
            ).on(table.updated_by),
        };
    }
);

export const work_schedules = pgTable("work_schedules", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    name: text("name").notNull(),
    active: boolean("active").default(true).notNull(),
    organization_id: uuid("organization_id")
        .notNull()
        .references(() => organization.id, { onUpdate: "cascade" }),
    days: text("days").array(),
    start_time: time("start_time").notNull(),
    end_time: time("end_time").notNull(),
    max_start_time: time("max_start_time").notNull(),
    bonus_price: integer("bonus_price").default(0).notNull(),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    updated_at: timestamp("updated_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    created_by: uuid("created_by").references(() => users.id, {
        onUpdate: "cascade",
    }),
    updated_by: uuid("updated_by").references(() => users.id, {
        onUpdate: "cascade",
    }),
});

export const terminals = pgTable(
    "terminals",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        name: text("name").notNull(),
        active: boolean("active").default(true).notNull(),
        phone: text("phone"),
        address: text("address"),
        latitude: doublePrecision("latitude").notNull(),
        longitude: doublePrecision("longitude").notNull(),
        external_id: text("external_id").notNull(),
        organization_id: uuid("organization_id")
            .notNull()
            .references(() => organization.id, { onUpdate: "cascade" }),
        manager_name: text("manager_name"),
        fuel_bonus: boolean("fuel_bonus").default(false).notNull(),
        linked_terminal_id: uuid("linked_terminal_id"),
        time_to_yandex: integer("time_to_yandex").default(0).notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
    },
    (table) => {
        return {
            external_id_key: uniqueIndex("terminals_external_id_key").on(
                table.external_id
            ),
            FK_terminals_linked_terminal_id: foreignKey({
                columns: [table.linked_terminal_id],
                foreignColumns: [table.id],
            }).onUpdate("cascade"),
        };
    }
);

export const organization = pgTable("organization", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    name: text("name").notNull(),
    external_id: text("external_id"),
    active: boolean("active").default(true).notNull(),
    system_type: organization_system_type("system_type")
        .default("iiko")
        .notNull(),
    phone: text("phone").notNull(),
    iiko_login: text("iiko_login"),
    webhook: text("webhook"),
    group_id: text("group_id"),
    apelsin_login: text("apelsin_login"),
    apelsin_password: text("apelsin_password"),
    sender_name: text("sender_name"),
    sender_number: text("sender_number"),
    description: text("description"),
    max_distance: integer("max_distance").default(0).notNull(),
    max_active_order_count: integer("max_active_order_count")
        .default(0)
        .notNull(),
    max_order_close_distance: integer("max_order_close_distance")
        .default(0)
        .notNull(),
    payment_type: organization_payment_types("payment_type")
        .default("client")
        .notNull(),
    support_chat_url: text("support_chat_url"),
    icon_url: text("icon_url"),
    allow_yandex_delivery: boolean("allow_yandex_delivery")
        .default(false)
        .notNull(),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    updated_at: timestamp("updated_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    created_by: uuid("created_by").references(() => users.id, {
        onUpdate: "cascade",
    }),
    updated_by: uuid("updated_by").references(() => users.id, {
        onUpdate: "cascade",
    }),
});

export const work_schedule_entries = pgTable(
    "work_schedule_entries",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        work_schedule_id: uuid("work_schedule_id")
            .notNull()
            .references(() => work_schedules.id, { onUpdate: "cascade" }),
        date_start: timestamp("date_start", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).notNull(),
        date_finish: timestamp("date_finish", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }),
        duration: integer("duration").default(0).notNull(),
        ip_open: text("ip_open"),
        ip_close: text("ip_close"),
        lat_open: doublePrecision("lat_open").notNull(),
        lat_close: doublePrecision("lat_close"),
        lon_open: doublePrecision("lon_open").notNull(),
        lon_close: doublePrecision("lon_close"),
        current_status: work_schedule_entry_status("current_status")
            .default("open")
            .notNull(),
        late: boolean("late").default(false).notNull(),
        created_at: timestamp("created_at", { precision: 5, mode: "string" })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", { precision: 5, mode: "string" })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            fki_work_schedule_entries_current_status: index(
                "fki_work_schedule_entries_current_status"
            ).on(table.current_status),
            fki_work_schedule_entries_user_id: index(
                "fki_work_schedule_entries_user_id"
            ).on(table.user_id),
        };
    }
);

export const customers = pgTable(
    "customers",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        name: text("name").notNull(),
        phone: text("phone").notNull(),
    },
    (table) => {
        return {
            phone_key: uniqueIndex("customers_phone_key").on(table.phone),
        };
    }
);

export const customers_comments = pgTable("customers_comments", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    customer_id: uuid("customer_id")
        .notNull()
        .references(() => customers.id, { onUpdate: "cascade" }),
    comment: text("comment"),
    voice_id: uuid("voice_id").references(() => assets.id, {
        onUpdate: "cascade",
    }),
    image_id: uuid("image_id").references(() => assets.id, {
        onUpdate: "cascade",
    }),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    created_by: uuid("created_by").references(() => users.id, {
        onUpdate: "cascade",
    }),
});

export const order_status = pgTable("order_status", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    name: text("name").notNull(),
    sort: integer("sort").default(0).notNull(),
    organization_id: uuid("organization_id")
        .notNull()
        .references(() => organization.id, { onUpdate: "cascade" }),
    color: text("color"),
    code: text("code"),
    status_change_text: text("status_change_text"),
    finish: boolean("finish").default(false).notNull(),
    cancel: boolean("cancel").default(false).notNull(),
    waiting: boolean("waiting").default(false).notNull(),
    need_location: boolean("need_location").default(false).notNull(),
    on_way: boolean("on_way").default(false).notNull(),
    in_terminal: boolean("in_terminal").default(false).notNull(),
    should_pay: boolean("should_pay").default(false).notNull(),
    yandex_delivery_statuses: text("yandex_delivery_statuses"),
});

export const api_tokens = pgTable(
    "api_tokens",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        active: boolean("active").default(false).notNull(),
        token: text("token").notNull(),
        organization_id: uuid("organization_id")
            .notNull()
            .references(() => organization.id, { onUpdate: "cascade" }),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            id_key: uniqueIndex("api_tokens_id_key").on(table.id),
            token_key: uniqueIndex("api_tokens_token_key").on(table.token),
        };
    }
);

export const order_votes = pgTable(
    "order_votes",
    {
        id: uuid("id").defaultRandom().notNull(),
        order_id: uuid("order_id").notNull(),
        order_created_at: timestamp("order_created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).notNull(),
        terminal_id: uuid("terminal_id")
            .notNull()
            .references(() => terminals.id, { onUpdate: "cascade" }),
        courier_id: uuid("courier_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        is_voting: boolean("is_voting").default(true).notNull(),
        is_chosen: boolean("is_chosen").default(false).notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            terminal_id_idx: index("order_votes_terminal_id_idx").on(
                table.terminal_id
            ),
            PK_order_votes_id_order_created_at: primaryKey(
                table.id,
                table.order_created_at
            ),
        };
    }
);

export const order_transactions = pgTable(
    "order_transactions",
    {
        id: uuid("id").defaultRandom().notNull(),
        order_id: uuid("order_id"),
        terminal_id: uuid("terminal_id")
            .notNull()
            .references(() => terminals.id, { onUpdate: "cascade" }),
        courier_id: uuid("courier_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        organization_id: uuid("organization_id")
            .notNull()
            .references(() => organization.id, { onUpdate: "cascade" }),
        card_number: text("card_number"),
        amount: doublePrecision("amount").notNull(),
        balance_before: doublePrecision("balance_before").notNull(),
        balance_after: doublePrecision("balance_after").notNull(),
        not_paid_amount: doublePrecision("not_paid_amount").notNull(),
        status: order_transaction_status("status").default("pending").notNull(),
        transaction_payment_type: order_transaction_payment_type(
            "transaction_payment_type"
        )
            .default("cash")
            .notNull(),
        transaction_type: text("transaction_type").notNull(),
        comment: text("comment"),
        error_text: text("error_text"),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            terminal_id_idx: index("order_transactions_terminal_id_idx").on(
                table.terminal_id
            ),
            order_id_idx: index("order_transactions_order_id_idx").on(table.order_id),
            courier_id_idx: index("order_transactions_courier_id_idx").on(
                table.courier_id
            ),
            organization_id_idx: index("order_transactions_organization_id_idx").on(
                table.organization_id
            ),
            PK_order_transactions_id_created_at: primaryKey(
                table.id,
                table.created_at
            ),
        };
    }
);

export const outside_requests = pgTable("outside_requests", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    request_type: text("request_type").notNull(),
    request_data: text("request_data").notNull(),
    response_data: text("response_data"),
    response_status: text("response_status"),
    external_url: text("external_url").notNull(),
    model_name: text("model_name").notNull(),
    model_id: text("model_id").notNull(),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    created_by: uuid("created_by").references(() => users.id, {
        onUpdate: "cascade",
    }),
    updated_at: timestamp("updated_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    updated_by: uuid("updated_by").references(() => users.id, {
        onUpdate: "cascade",
    }),
});

export const assets = pgTable("assets", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    model: text("model").notNull(),
    file_name: text("file_name").notNull(),
    model_id: text("model_id"),
    sub_folder: text("sub_folder").notNull(),
});

export const courier_terminal_balance = pgTable(
    "courier_terminal_balance",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        courier_id: uuid("courier_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        terminal_id: uuid("terminal_id")
            .notNull()
            .references(() => terminals.id, { onUpdate: "cascade" }),
        organization_id: uuid("organization_id")
            .notNull()
            .references(() => organization.id, { onUpdate: "cascade" }),
        balance: doublePrecision("balance").notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            courier_id_idx: index("courier_terminal_balance_courier_id_idx").on(
                table.courier_id
            ),
            terminal_id_idx: index("courier_terminal_balance_terminal_id_idx").on(
                table.terminal_id
            ),
            organization_id_idx: index(
                "courier_terminal_balance_organization_id_idx"
            ).on(table.organization_id),
        };
    }
);

export const manager_withdraw = pgTable(
    "manager_withdraw",
    {
        id: uuid("id").defaultRandom().notNull(),
        manager_id: uuid("manager_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        courier_id: uuid("courier_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        terminal_id: uuid("terminal_id")
            .notNull()
            .references(() => terminals.id, { onUpdate: "cascade" }),
        organization_id: uuid("organization_id")
            .notNull()
            .references(() => organization.id, { onUpdate: "cascade" }),
        amount: doublePrecision("amount").notNull(),
        amount_before: doublePrecision("amount_before").notNull(),
        amount_after: doublePrecision("amount_after").notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        payed_date: timestamp("payed_date", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).defaultNow(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            manager_id_idx: index("manager_withdraw_manager_id_idx").on(
                table.manager_id
            ),
            terminal_id_idx: index("manager_withdraw_terminal_id_idx").on(
                table.terminal_id
            ),
            organization_id_idx: index("manager_withdraw_organization_id_idx").on(
                table.organization_id
            ),
            PK_manager_withdraw_id_created_at: primaryKey(table.id, table.created_at),
        };
    }
);

export const manager_withdraw_transactions = pgTable(
    "manager_withdraw_transactions",
    {
        id: uuid("id").defaultRandom().notNull(),
        withdraw_id: uuid("withdraw_id").notNull(),
        transaction_id: uuid("transaction_id").notNull(),
        transaction_created_at: timestamp("transaction_created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).notNull(),
        amount: doublePrecision("amount").notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        payed_date: timestamp("payed_date", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).defaultNow(),
    },
    (table) => {
        return {
            PK_manager_withdraw_transactions_id_order_created_at: primaryKey(
                table.id,
                table.transaction_created_at
            ),
        };
    }
);

export const system_configs = pgTable(
    "system_configs",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        name: text("name").notNull(),
        value: text("value").notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
    },
    (table) => {
        return {
            name_key: uniqueIndex("system_configs_name_key").on(table.name),
        };
    }
);

export const brands = pgTable("brands", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    name: text("name").notNull(),
    api_url: text("api_url").notNull(),
    logo_path: text("logo_path"),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    updated_at: timestamp("updated_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
});

export const timesheet = pgTable("timesheet", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    user_id: uuid("user_id")
        .notNull()
        .references(() => users.id, { onUpdate: "cascade" }),
    is_late: boolean("is_late").default(false).notNull(),
    date: timestamp("date", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    }).notNull(),
    late_minutes: integer("late_minutes"),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    updated_at: timestamp("updated_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
});

export const scheduled_reports = pgTable("scheduled_reports", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    cron: text("cron").notNull(),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    updated_at: timestamp("updated_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
});

export const daily_garant = pgTable("daily_garant", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    name: text("name").notNull(),
    date: time("date").notNull(),
    amount: doublePrecision("amount").notNull(),
    late_minus_sum: doublePrecision("late_minus_sum").notNull(),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    updated_at: timestamp("updated_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
});

export const daily_garant_tasks = pgTable("daily_garant_tasks", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    daily_garant_id: uuid("daily_garant_id")
        .notNull()
        .references(() => daily_garant.id, { onUpdate: "cascade" }),
    user_id: uuid("user_id")
        .notNull()
        .references(() => users.id, { onUpdate: "cascade" }),
    timesheet_id: uuid("timesheet_id")
        .notNull()
        .references(() => timesheet.id, { onUpdate: "cascade" }),
    status: text("status").notNull(),
    amount: doublePrecision("amount").notNull(),
    late_minus_sum: doublePrecision("late_minus_sum").notNull(),
    calculated_sum: doublePrecision("calculated_sum").notNull(),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    updated_at: timestamp("updated_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
});

export const otp = pgTable("otp", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    user_id: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    otp: varchar("otp", { length: 6 }).notNull(),
    expiry_date: timestamp("expiry_date", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    }).notNull(),
    verified: boolean("verified").default(false).notNull(),
    created_at: timestamp("created_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
    updated_at: timestamp("updated_at", {
        precision: 5,
        withTimezone: true,
        mode: "string",
    })
        .defaultNow()
        .notNull(),
});

export const scheduled_reports_subscription = pgTable(
    "scheduled_reports_subscription",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        report_id: uuid("report_id")
            .notNull()
            .references(() => scheduled_reports.id, { onUpdate: "cascade" }),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
    }
);

export const users_terminals = pgTable(
    "users_terminals",
    {
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        terminal_id: uuid("terminal_id")
            .notNull()
            .references(() => terminals.id, { onUpdate: "cascade" }),
    },
    (table) => {
        return {
            PK_users_terminals_id: primaryKey(table.user_id, table.terminal_id),
        };
    }
);

export const users_work_schedules = pgTable(
    "users_work_schedules",
    {
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        work_schedule_id: uuid("work_schedule_id")
            .notNull()
            .references(() => work_schedules.id, { onUpdate: "cascade" }),
    },
    (table) => {
        return {
            PK_users_work_schedules_id: primaryKey(
                table.user_id,
                table.work_schedule_id
            ),
        };
    }
);

export const roles_permissions = pgTable(
    "roles_permissions",
    {
        role_id: uuid("role_id")
            .notNull()
            .references(() => roles.id, { onUpdate: "cascade" }),
        permission_id: uuid("permission_id")
            .notNull()
            .references(() => permissions.id, { onUpdate: "cascade" }),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            PK_0cd11f0b35c4d348c6ebb9b36b7: primaryKey(
                table.role_id,
                table.permission_id
            ),
        };
    }
);

export const users_permissions = pgTable(
    "users_permissions",
    {
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        permission_id: uuid("permission_id")
            .notNull()
            .references(() => permissions.id, { onUpdate: "cascade" }),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            PK_7f3736984cd8546a1e418005561: primaryKey(
                table.user_id,
                table.permission_id
            ),
        };
    }
);

export const users_roles = pgTable(
    "users_roles",
    {
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        role_id: uuid("role_id")
            .notNull()
            .references(() => roles.id, { onUpdate: "cascade" }),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
        updated_by: uuid("updated_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            PK_c525e9373d63035b9919e578a9c: primaryKey(table.user_id, table.role_id),
        };
    }
);

export const order_actions = pgTable(
    "order_actions",
    {
        id: uuid("id").defaultRandom().notNull(),
        order_id: uuid("order_id").notNull(),
        order_created_at: timestamp("order_created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).notNull(),
        duration: integer("duration").default(0).notNull(),
        action: text("action"),
        action_text: text("action_text").notNull(),
        terminal_id: uuid("terminal_id")
            .notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by"),
    },
    (table) => {
        return {
            PK_order_actions_id_order_created_at: primaryKey(
                table.id,
                table.order_created_at
            ),
        };
    }
);

export const order_locations = pgTable(
    "order_locations",
    {
        id: uuid("id").defaultRandom().notNull(),
        order_id: uuid("order_id").notNull(),
        order_created_at: timestamp("order_created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).notNull(),
        terminal_id: uuid("terminal_id")
            .notNull()
            .references(() => terminals.id, { onUpdate: "cascade" }),
        courier_id: uuid("courier_id")
            .notNull()
            .references(() => users.id, { onUpdate: "cascade" }),
        order_status_id: uuid("order_status_id").notNull(),
        lat: doublePrecision("lat").notNull(),
        lon: doublePrecision("lon").notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by").references(() => users.id, {
            onUpdate: "cascade",
        }),
    },
    (table) => {
        return {
            id_key: uniqueIndex("order_locations_id_key").on(table.id),
            PK_order_locations_id_order_created_at: primaryKey(
                table.id,
                table.order_created_at
            ),
        };
    }
);

export const orders = pgTable(
    "orders",
    {
        id: uuid("id").defaultRandom().notNull(),
        organization_id: uuid("organization_id")
            .notNull(),
        customer_id: uuid("customer_id")
            .notNull(),
        courier_id: uuid("courier_id"),
        terminal_id: uuid("terminal_id")
            .notNull(),
        order_status_id: uuid("order_status_id")
            .notNull(),
        delivery_type: drive_type("delivery_type").default("car").notNull(),
        from_lat: doublePrecision("from_lat").notNull(),
        from_lon: doublePrecision("from_lon").notNull(),
        to_lat: doublePrecision("to_lat").notNull(),
        to_lon: doublePrecision("to_lon").notNull(),
        wrong_lat: doublePrecision("wrong_lat").default(0).notNull(),
        wrong_lon: doublePrecision("wrong_lon").default(0).notNull(),
        pre_distance: doublePrecision("pre_distance").notNull(),
        pre_duration: integer("pre_duration").default(0).notNull(),
        order_number: text("order_number").notNull(),
        distance: doublePrecision("distance"),
        duration: integer("duration").default(0),
        order_price: doublePrecision("order_price").notNull(),
        delivery_price: doublePrecision("delivery_price").notNull(),
        customer_delivery_price: doublePrecision(
            "customer_delivery_price"
        ).notNull(),
        delivery_address: text("delivery_address").notNull(),
        finished_date: timestamp("finished_date", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }),
        delivery_comment: text("delivery_comment"),
        payment_type: text("payment_type").notNull(),
        cancel_reason: text("cancel_reason"),
        sms_sent_to_customer: boolean("sms_sent_to_customer")
            .default(false)
            .notNull(),
        score: integer("score"),
        order_items: jsonb("order_items"),
        delivery_pricing_id: uuid("delivery_pricing_id"),
        cancel_voice_id: uuid("cancel_voice_id"),
        operator_notes: text("operator_notes"),
        delivery_schedule: text("delivery_schedule"),
        later_time: text("later_time"),
        cooked_time: timestamp("cooked_time", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }),
        additional_phone: text("additional_phone"),
        house: text("house"),
        flat: text("flat"),
        entrance: text("entrance"),
        yandex_pincode: text("yandex_pincode"),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        })
            .defaultNow()
            .notNull(),
        created_by: uuid("created_by"),
        updated_by: uuid("updated_by"),
    },
    (table) => {
        return {
            IX_orders_customer_id: index("IX_orders_customer_id").on(
                table.customer_id
            ),
            IX_orders_courier_id: index("IX_orders_courier_id").on(table.courier_id),
            IX_orders_order_status_id: index("IX_orders_order_status_id").on(
                table.order_status_id
            ),
            IX_orders_organization_id: index("IX_orders_organization_id").on(
                table.organization_id
            ),
            PK_orders_id_created_at: primaryKey(table.id, table.created_at),
        };
    }
);

export const order_items = pgTable(
    "order_items",
    {
        id: uuid("id").defaultRandom().notNull(),
        order_id: uuid("order_id").notNull(),
        order_created_at: timestamp("order_created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).notNull(),
        product_id: integer("product_id").notNull(),
        name: text("name").notNull(),
        price: doublePrecision("price").notNull(),
        quantity: integer("quantity").notNull(),
    },
    (table) => {
        return {
            PK_order_items_id_order_created_at: primaryKey(
                table.id,
                table.order_created_at
            ),
        };
    }
);

export const missed_orders = pgTable(
    "missed_orders",
    {
        id: uuid("id").defaultRandom().notNull(),
        order_id: uuid("order_id").notNull(),
        order_created_at: timestamp("order_created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).notNull(),
        system_minutes_config: integer("system_minutes_config").notNull(),
    },
    (table) => {
        return {
            PK_missed_orders_id_order_created_at: primaryKey(
                table.id,
                table.order_created_at
            ),
        };
    }
);


export const constructed_bonus_pricing = pgTable(
    "constructed_bonus_pricing",
    {
        id: uuid("id").defaultRandom().primaryKey().notNull(),
        name: text("name").notNull(),
        organization_id: uuid("organization_id")
            .notNull()
            .references(() => organization.id, {
                onDelete: "restrict",
                onUpdate: "cascade",
            }),
        pricing: jsonb("pricing").notNull(),
        created_at: timestamp("created_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).defaultNow().notNull(),
        updated_at: timestamp("updated_at", {
            precision: 5,
            withTimezone: true,
            mode: "string",
        }).defaultNow().notNull(),
    }
);
-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
DO $$ BEGIN
 CREATE TYPE "order_transaction_payment_type" AS ENUM('card', 'cash');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "order_transaction_status" AS ENUM('failed', 'success', 'pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "organization_payment_types" AS ENUM('client', 'card', 'cash');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "organization_system_type" AS ENUM('jowi', 'r_keeper', 'iiko');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "drive_type" AS ENUM('bycicle', 'foot', 'bike', 'car');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_status" AS ENUM('inactive', 'blocked', 'active');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "price_type" AS ENUM('perMonth', 'fixed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "status" AS ENUM('archived', 'published', 'draft');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "sale_type" AS ENUM('new_building', 'rent', 'buy');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "type" AS ENUM('json', 'enum', 'datetime', 'date', 'boolean', 'float', 'integer', 'string');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "work_schedule_entry_status" AS ENUM('closed', 'open');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" bigint NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"description" varchar(60) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"code" varchar(50),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "typeorm_metadata" (
	"type" varchar NOT NULL,
	"database" varchar,
	"schema" varchar,
	"table" varchar,
	"name" varchar,
	"value" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"password" varchar(100),
	"is_super_user" boolean DEFAULT false NOT NULL,
	"status" "user_status" NOT NULL,
	"drive_type" "drive_type",
	"card_name" varchar(100),
	"card_number" varchar(100),
	"birth_date" timestamp(5) with time zone,
	"car_model" varchar(100),
	"car_number" varchar(100),
	"is_online" boolean DEFAULT false NOT NULL,
	"latitude" double precision DEFAULT 0,
	"longitude" double precision DEFAULT 0,
	"fcm_token" varchar(250),
	"wallet_balance" double precision DEFAULT 0 NOT NULL,
	"max_active_order_count" integer,
	"doc_files" text[],
	"order_start_date" timestamp(5) with time zone,
	"app_version" varchar(100),
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"api_token" varchar(250),
	"tg_id" varchar(250),
	"daily_garant_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "city" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"price" integer DEFAULT 0 NOT NULL,
	"price_type" "price_type" DEFAULT 'fixed' NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"sale_type" "sale_type" DEFAULT 'buy' NOT NULL,
	"latitude" double precision DEFAULT 0 NOT NULL,
	"longitude" double precision DEFAULT 0 NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"city_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_prop_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_type" "sale_type" DEFAULT 'buy' NOT NULL,
	"name" text NOT NULL,
	"type" "type" DEFAULT 'string' NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"default" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"drive_type" "drive_type" DEFAULT 'car' NOT NULL,
	"days" text[],
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"min_price" integer,
	"rules" jsonb NOT NULL,
	"price_per_km" integer DEFAULT 0 NOT NULL,
	"customer_rules" jsonb,
	"customer_price_per_km" integer DEFAULT 0 NOT NULL,
	"min_distance_km" integer DEFAULT 0 NOT NULL,
	"organization_id" uuid NOT NULL,
	"terminal_id" uuid,
	"payment_type" "organization_payment_types" DEFAULT 'client',
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_bonus_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"max_order_time" integer DEFAULT 20 NOT NULL,
	"rules" jsonb NOT NULL,
	"min_distance_km" integer DEFAULT 0 NOT NULL,
	"organization_id" uuid NOT NULL,
	"terminal_id" uuid,
	"terminal_ids" text[],
	"courier_id" uuid,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"organization_id" uuid NOT NULL,
	"days" text[],
	"start_time" "time(5) with time zone" NOT NULL,
	"end_time" "time(5) with time zone" NOT NULL,
	"max_start_time" "time(5) with time zone" NOT NULL,
	"bonus_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "terminals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"phone" text,
	"address" text,
	"latitude" double precision DEFAULT 0 NOT NULL,
	"longitude" double precision DEFAULT 0 NOT NULL,
	"external_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"manager_name" text,
	"fuel_bonus" boolean DEFAULT false NOT NULL,
	"linked_terminal_id" uuid,
	"time_to_yandex" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"external_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"system_type" "organization_system_type" DEFAULT 'iiko' NOT NULL,
	"phone" text NOT NULL,
	"iiko_login" text,
	"webhook" text,
	"group_id" text,
	"apelsin_login" text,
	"apelsin_password" text,
	"sender_name" text,
	"sender_number" text,
	"description" text,
	"max_distance" integer DEFAULT 0 NOT NULL,
	"max_active_order_count" integer DEFAULT 0 NOT NULL,
	"max_order_close_distance" integer DEFAULT 0 NOT NULL,
	"payment_type" "organization_payment_types" DEFAULT 'client' NOT NULL,
	"support_chat_url" text,
	"icon_url" text,
	"allow_yandex_delivery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_schedule_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"work_schedule_id" uuid NOT NULL,
	"date_start" timestamp(5) with time zone NOT NULL,
	"date_finish" timestamp(5) with time zone,
	"duration" integer DEFAULT 0 NOT NULL,
	"ip_open" text,
	"ip_close" text,
	"lat_open" double precision DEFAULT 0 NOT NULL,
	"lat_close" double precision DEFAULT 0,
	"lon_open" double precision DEFAULT 0 NOT NULL,
	"lon_close" double precision DEFAULT 0,
	"current_status" "work_schedule_entry_status" DEFAULT 'open' NOT NULL,
	"late" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(5) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"comment" text,
	"voice_id" uuid,
	"image_id" uuid,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"organization_id" uuid NOT NULL,
	"color" text,
	"code" text,
	"status_change_text" text,
	"finish" boolean DEFAULT false NOT NULL,
	"cancel" boolean DEFAULT false NOT NULL,
	"waiting" boolean DEFAULT false NOT NULL,
	"need_location" boolean DEFAULT false NOT NULL,
	"on_way" boolean DEFAULT false NOT NULL,
	"in_terminal" boolean DEFAULT false NOT NULL,
	"should_pay" boolean DEFAULT false NOT NULL,
	"yandex_delivery_statuses" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"token" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"terminal_id" uuid NOT NULL,
	"courier_id" uuid NOT NULL,
	"is_voting" boolean DEFAULT true NOT NULL,
	"is_chosen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"terminal_id" uuid NOT NULL,
	"courier_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"card_number" text,
	"amount" double precision DEFAULT 0 NOT NULL,
	"balance_before" double precision DEFAULT 0 NOT NULL,
	"balance_after" double precision DEFAULT 0 NOT NULL,
	"not_paid_amount" double precision DEFAULT 0 NOT NULL,
	"status" "order_transaction_status" DEFAULT 'pending' NOT NULL,
	"transaction_payment_type" "order_transaction_payment_type" DEFAULT 'cash' NOT NULL,
	"transaction_type" text NOT NULL,
	"comment" text,
	"error_text" text,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outside_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_type" text NOT NULL,
	"request_data" text NOT NULL,
	"response_data" text,
	"response_status" text,
	"external_url" text NOT NULL,
	"model_name" text NOT NULL,
	"model_id" text NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" text NOT NULL,
	"file_name" text NOT NULL,
	"model_id" text,
	"sub_folder" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courier_terminal_balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"courier_id" uuid NOT NULL,
	"terminal_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manager_withdraw" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"courier_id" uuid NOT NULL,
	"terminal_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"amount_before" double precision DEFAULT 0 NOT NULL,
	"amount_after" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"payed_date" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manager_withdraw_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"withdraw_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"payed_date" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"api_url" text NOT NULL,
	"logo_path" text,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "timesheet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"date" timestamp(5) with time zone NOT NULL,
	"late_minutes" integer,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"cron" text NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_garant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" "time(5) with time zone" NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"late_minus_sum" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_garant_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_garant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"timesheet_id" uuid NOT NULL,
	"status" text NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"late_minus_sum" double precision DEFAULT 0 NOT NULL,
	"calculated_sum" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"otp" varchar(6) NOT NULL,
	"expiry_date" timestamp(5) with time zone NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_reports_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_terminals" (
	"user_id" uuid NOT NULL,
	"terminal_id" uuid NOT NULL,
	CONSTRAINT PK_users_terminals_id PRIMARY KEY("user_id","terminal_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_work_schedules" (
	"user_id" uuid NOT NULL,
	"work_schedule_id" uuid NOT NULL,
	CONSTRAINT PK_users_work_schedules_id PRIMARY KEY("user_id","work_schedule_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT PK_0cd11f0b35c4d348c6ebb9b36b7 PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_permissions" (
	"user_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT PK_7f3736984cd8546a1e418005561 PRIMARY KEY("user_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT PK_c525e9373d63035b9919e578a9c PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_actions" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"action" text,
	"action_text" text NOT NULL,
	"terminal_id" uuid NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	CONSTRAINT PK_order_actions_id_terminal_id PRIMARY KEY("id","terminal_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_locations" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"terminal_id" uuid NOT NULL,
	"courier_id" uuid NOT NULL,
	"order_status_id" uuid NOT NULL,
	"lat" double precision DEFAULT 0 NOT NULL,
	"lon" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	CONSTRAINT PK_order_locations_id_terminal_id PRIMARY KEY("id","terminal_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"courier_id" uuid,
	"terminal_id" uuid NOT NULL,
	"order_status_id" uuid NOT NULL,
	"delivery_type" "drive_type" DEFAULT 'car' NOT NULL,
	"from_lat" double precision DEFAULT 0 NOT NULL,
	"from_lon" double precision DEFAULT 0 NOT NULL,
	"to_lat" double precision DEFAULT 0 NOT NULL,
	"to_lon" double precision DEFAULT 0 NOT NULL,
	"wrong_lat" double precision DEFAULT 0 NOT NULL,
	"wrong_lon" double precision DEFAULT 0 NOT NULL,
	"pre_distance" double precision DEFAULT 0 NOT NULL,
	"pre_duration" integer DEFAULT 0 NOT NULL,
	"order_number" text NOT NULL,
	"distance" double precision DEFAULT 0,
	"duration" integer DEFAULT 0,
	"order_price" double precision DEFAULT 0 NOT NULL,
	"delivery_price" double precision DEFAULT 0 NOT NULL,
	"customer_delivery_price" double precision DEFAULT 0 NOT NULL,
	"delivery_address" text NOT NULL,
	"finished_date" timestamp(5) with time zone,
	"delivery_comment" text,
	"payment_type" text NOT NULL,
	"cancel_reason" text,
	"sms_sent_to_customer" boolean DEFAULT false NOT NULL,
	"score" integer,
	"order_items" jsonb,
	"delivery_pricing_id" uuid,
	"cancel_voice_id" uuid,
	"operator_notes" text,
	"delivery_schedule" text,
	"later_time" text,
	"cooked_time" timestamp(5) with time zone,
	"additional_phone" text,
	"yandex_pincode" text,
	"created_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(5) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT PK_orders_id_terminal_id PRIMARY KEY("id","terminal_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_d090ad82a0e97ce764c06c7b312" ON "permissions" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_648e3f5447f725579d7d4ffdfb7" ON "roles" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_0e2c0e1b4b0b0b0b0b0b0b0b0b0" ON "roles" ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_a000cca60bcf04454e727699490" ON "users" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_FK_city_created_by" ON "city" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_FK_city_updated_by" ON "city" ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_FK_post_created_by" ON "post" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_FK_post_updated_by" ON "post" ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_FK_post_prop_types_created_by" ON "post_prop_types" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_FK_delivery_pricing_created_by" ON "delivery_pricing" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_FK_delivery_pricing_updated_by" ON "delivery_pricing" ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_FK_order_bonus_pricing_created_by" ON "order_bonus_pricing" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_FK_order_bonus_pricing_updated_by" ON "order_bonus_pricing" ("updated_by");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "terminals_external_id_key" ON "terminals" ("external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_work_schedule_entries_current_status" ON "work_schedule_entries" ("current_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fki_work_schedule_entries_user_id" ON "work_schedule_entries" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_phone_key" ON "customers" ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_tokens_id_key" ON "api_tokens" ("id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_tokens_token_key" ON "api_tokens" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_votes_terminal_id_idx" ON "order_votes" ("terminal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_votes_order_id_idx" ON "order_votes" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_transactions_terminal_id_idx" ON "order_transactions" ("terminal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_transactions_order_id_idx" ON "order_transactions" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_transactions_courier_id_idx" ON "order_transactions" ("courier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_transactions_organization_id_idx" ON "order_transactions" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courier_terminal_balance_courier_id_idx" ON "courier_terminal_balance" ("courier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courier_terminal_balance_terminal_id_idx" ON "courier_terminal_balance" ("terminal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courier_terminal_balance_organization_id_idx" ON "courier_terminal_balance" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_withdraw_manager_id_idx" ON "manager_withdraw" ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_withdraw_terminal_id_idx" ON "manager_withdraw" ("terminal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_withdraw_organization_id_idx" ON "manager_withdraw" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "system_configs_name_key" ON "system_configs" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "order_actions_id_key" ON "order_actions" ("id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "order_locations_id_key" ON "order_locations" ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IX_orders_customer_id" ON "orders" ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IX_orders_courier_id" ON "orders" ("courier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IX_orders_order_status_id" ON "orders" ("order_status_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IX_orders_organization_id" ON "orders" ("organization_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permissions" ADD CONSTRAINT "FK_c398f7100db3e0d9b6a6cd6beaf" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permissions" ADD CONSTRAINT "FK_58fae278276b7c2c6dde2bc19a5" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles" ADD CONSTRAINT "FK_4a39f3095781cdd9d6061afaae5" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles" ADD CONSTRAINT "FK_747b580d73db0ad78963d78b076" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "FK_8c6e2b0b3c2f3c7e7e3e3e2e2e2" FOREIGN KEY ("daily_garant_id") REFERENCES "daily_garant"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "city" ADD CONSTRAINT "FK_city_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "city" ADD CONSTRAINT "FK_city_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "city" ADD CONSTRAINT "FK_city_parent_id" FOREIGN KEY ("parent_id") REFERENCES "city"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "FK_post_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "FK_post_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "FK_post_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "FK_post_city_id" FOREIGN KEY ("city_id") REFERENCES "city"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_prop_types" ADD CONSTRAINT "FK_post_prop_types_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_prop_types" ADD CONSTRAINT "FK_post_prop_types_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_pricing" ADD CONSTRAINT "FK_delivery_pricing_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_pricing" ADD CONSTRAINT "FK_delivery_pricing_terminal_id" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_pricing" ADD CONSTRAINT "FK_delivery_pricing_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delivery_pricing" ADD CONSTRAINT "FK_delivery_pricing_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_bonus_pricing" ADD CONSTRAINT "FK_order_bonus_pricing_courier_id" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_bonus_pricing" ADD CONSTRAINT "FK_order_bonus_pricing_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_bonus_pricing" ADD CONSTRAINT "FK_order_bonus_pricing_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_bonus_pricing" ADD CONSTRAINT "order_bonus_pricing_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_bonus_pricing" ADD CONSTRAINT "order_bonus_pricing_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_schedules" ADD CONSTRAINT "FK_work_schedules_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_schedules" ADD CONSTRAINT "FK_work_schedules_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_schedules" ADD CONSTRAINT "FK_work_schedules_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "terminals" ADD CONSTRAINT "FK_terminals_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "terminals" ADD CONSTRAINT "FK_terminals_linked_terminal_id" FOREIGN KEY ("linked_terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization" ADD CONSTRAINT "FK_organization_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization" ADD CONSTRAINT "FK_organization_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_schedule_entries" ADD CONSTRAINT "FK_work_schedule_entries_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_schedule_entries" ADD CONSTRAINT "FK_work_schedule_entries_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_schedule_entries" ADD CONSTRAINT "FK_work_schedule_entries_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_schedule_entries" ADD CONSTRAINT "FK_work_schedule_entries_work_schedule_id" FOREIGN KEY ("work_schedule_id") REFERENCES "work_schedules"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers_comments" ADD CONSTRAINT "FK_customers_comments_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers_comments" ADD CONSTRAINT "FK_customers_comments_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers_comments" ADD CONSTRAINT "FK_customers_comments_voice_id" FOREIGN KEY ("voice_id") REFERENCES "assets"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers_comments" ADD CONSTRAINT "FK_customers_comments_image_id" FOREIGN KEY ("image_id") REFERENCES "assets"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_status" ADD CONSTRAINT "FK_order_status_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_tokens" ADD CONSTRAINT "FK_api_tokens_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_tokens" ADD CONSTRAINT "FK_api_tokens_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_tokens" ADD CONSTRAINT "FK_api_tokens_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_votes" ADD CONSTRAINT "FK_order_votes_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_votes" ADD CONSTRAINT "FK_order_votes_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_votes" ADD CONSTRAINT "FK_order_votes_terminal_id" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_votes" ADD CONSTRAINT "FK_order_votes_courier_id" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_transactions" ADD CONSTRAINT "FK_order_transactions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_transactions" ADD CONSTRAINT "FK_order_transactions_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_transactions" ADD CONSTRAINT "FK_order_transactions_terminal_id" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_transactions" ADD CONSTRAINT "FK_order_transactions_courier_id" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_transactions" ADD CONSTRAINT "FK_order_transactions_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outside_requests" ADD CONSTRAINT "FK_outside_requests_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outside_requests" ADD CONSTRAINT "FK_outside_requests_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courier_terminal_balance" ADD CONSTRAINT "FK_courier_terminal_balance_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courier_terminal_balance" ADD CONSTRAINT "FK_courier_terminal_balance_courier_id" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courier_terminal_balance" ADD CONSTRAINT "FK_courier_terminal_balance_terminal_id" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courier_terminal_balance" ADD CONSTRAINT "FK_courier_terminal_balance_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manager_withdraw" ADD CONSTRAINT "FK_manager_withdraw_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manager_withdraw" ADD CONSTRAINT "FK_manager_withdraw_manager_id" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manager_withdraw" ADD CONSTRAINT "FK_manager_withdraw_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manager_withdraw" ADD CONSTRAINT "FK_manager_withdraw_courier_id" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manager_withdraw" ADD CONSTRAINT "FK_manager_withdraw_terminal_id" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manager_withdraw_transactions" ADD CONSTRAINT "FK_manager_withdraw_transactions_withdraw_id" FOREIGN KEY ("withdraw_id") REFERENCES "manager_withdraw"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manager_withdraw_transactions" ADD CONSTRAINT "FK_manager_withdraw_transactions_transaction_id" FOREIGN KEY ("transaction_id") REFERENCES "order_transactions"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet" ADD CONSTRAINT "FK_timesheet_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_garant_tasks" ADD CONSTRAINT "FK_daily_garant_tasks_daily_garant_id" FOREIGN KEY ("daily_garant_id") REFERENCES "daily_garant"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_garant_tasks" ADD CONSTRAINT "FK_daily_garant_tasks_timesheet_id" FOREIGN KEY ("timesheet_id") REFERENCES "timesheet"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_garant_tasks" ADD CONSTRAINT "FK_daily_garant_tasks_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "otp" ADD CONSTRAINT "fk_otp_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_reports_subscription" ADD CONSTRAINT "FK_scheduled_reports_subscription_report_id" FOREIGN KEY ("report_id") REFERENCES "scheduled_reports"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scheduled_reports_subscription" ADD CONSTRAINT "FK_scheduled_reports_subscription_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_terminals" ADD CONSTRAINT "FK_users_terminals_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_terminals" ADD CONSTRAINT "FK_users_terminals_terminal_id" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_work_schedules" ADD CONSTRAINT "FK_users_work_schedules_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_work_schedules" ADD CONSTRAINT "FK_users_work_schedules_work_schedule_id" FOREIGN KEY ("work_schedule_id") REFERENCES "work_schedules"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles_permissions" ADD CONSTRAINT "FK_a3f5b9874c55ee69fdd01531e14" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles_permissions" ADD CONSTRAINT "FK_337aa8dba227a1fe6b73998307b" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles_permissions" ADD CONSTRAINT "FK_7d2dad9f14eddeb09c256fea719" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles_permissions" ADD CONSTRAINT "FK_d1ba552f47d08621fdd2bbb0124" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_permissions" ADD CONSTRAINT "FK_1139f007de51cfe686c4b2abb43" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_permissions" ADD CONSTRAINT "FK_b09b9a210c60f41ec7b453758e9" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_permissions" ADD CONSTRAINT "FK_997b44464224900ee2727190813" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_permissions" ADD CONSTRAINT "FK_4de7d0b175f702be3be55270023" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_roles" ADD CONSTRAINT "FK_471c7c874c2a37052f53d920803" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_roles" ADD CONSTRAINT "FK_1cf664021f00b9cc1ff95e17de4" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_roles" ADD CONSTRAINT "FK_88da3fa85d1220b0ac18b08ce47" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_roles" ADD CONSTRAINT "FK_e4435209df12bc1f001e5360174" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_actions" ADD CONSTRAINT "FK_order_actions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_actions" ADD CONSTRAINT "FK_order_actions_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_actions" ADD CONSTRAINT "FK_order_actions_terminal_id" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_locations" ADD CONSTRAINT "FK_order_locations_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_locations" ADD CONSTRAINT "FK_order_locations_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_locations" ADD CONSTRAINT "FK_order_locations_terminal_id" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_locations" ADD CONSTRAINT "FK_order_locations_courier_id" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_courier_id" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_order_status_id" FOREIGN KEY ("order_status_id") REFERENCES "order_status"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_voice_id" FOREIGN KEY ("cancel_voice_id") REFERENCES "assets"("id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

*/
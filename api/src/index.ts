import { Elysia } from "elysia";
import Redis from "ioredis";
import { verifyJwt } from "./lib/bcrypt";
import { cors } from "@elysiajs/cors";
import bearer from "@elysiajs/bearer";
import { UsersController } from "./modules/user/controller";
import { CacheControlService } from "./modules/cache/service";
import { db } from "./lib/db";
import { CustomersController } from "./modules/customers/controller";
import { OrderStatusController } from "./modules/order_status/controller";
import { OrganizationsController } from "./modules/organizations/controller";
import { RolesController } from "./modules/roles/controller";
import { PermissionsController } from "./modules/permissions/controller";
import { TerminalsController } from "./modules/terminals/controller";
import { DeliveryPricingController } from "./modules/delivery_pricing/controller";
import { WorkSchedulesController } from "./modules/work_schedules/controller";
import { ApiTokensController } from "./modules/api_tokens/controller";
import { BrandsController } from "./modules/brands/controller";
import { DailyGarantController } from "./modules/daily_garant/controller";
import { OrderBonusPricingController } from "./modules/order_bonus_pricing/controller";
import { OrdersController } from "./modules/orders/controller";

const client = new Redis({
  maxRetriesPerRequest: null,
});

const cacheControl = new CacheControlService(db, client);

const app = new Elysia()
  .use(cors())
  .use(bearer())
  .state("redis", client)
  .state("cacheControl", cacheControl)
  .state("davr_data", {
    test: "test",
  })
  .get("/", () => "Hello Elysia")
  .use(UsersController)
  .use(CustomersController)
  .use(OrderStatusController)
  .use(OrganizationsController)
  .use(RolesController)
  .use(PermissionsController)
  .use(TerminalsController)
  .use(DeliveryPricingController)
  .use(WorkSchedulesController)
  .use(ApiTokensController)
  .use(BrandsController)
  .use(DailyGarantController)
  .use(OrderBonusPricingController)
  .use(OrdersController)
  .listen(3000);

export type BackendApp = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

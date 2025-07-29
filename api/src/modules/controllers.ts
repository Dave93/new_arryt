import { Elysia } from "elysia";
import { ApiTokensController } from "./api_tokens/controller";
import { BrandsController } from "./brands/controller";
import { CustomersController } from "./customers/controller";
import { DailyGarantController } from "./daily_garant/controller";
import { DeliveryPricingController } from "./delivery_pricing/controller";
import { ManagerWithdrawController } from "./manager_withdraw/controller";
import { MissedOrdersController } from "./missed_orders/controller";
import { OrderBonusPricingController } from "./order_bonus_pricing/controller";
import { OrderStatusController } from "./order_status/controller";
import { OrdersController } from "./orders/controller";
import { OrganizationsController } from "./organizations/controller";
import { PermissionsController } from "./permissions/controller";
import { RolesController } from "./roles/controller";
import { TerminalsController } from "./terminals/controller";
import { UsersController } from "./user/controller";
import { WorkSchedulesController } from "./work_schedules/controller";
import { OrderActionsController } from "./order_actions/controller";
import { externalControler } from "./external/controler";
import { constructedBonusPricingController } from "./constructed_bonus_pricing/controller";
import { systemConfigsController } from "./system_configs/controller";
import { orderTransactionsController } from "./order_transactions/controller";
import { chartControlller } from "./chart/controller";
import { CouriersController } from "./couriers/controller";
import { dashboardController } from "./dashboard/controller";
// User-related controllers
const userGroup = new Elysia({ name: "@app/users-group" })
  .use(UsersController)
  .use(CouriersController)
  .use(CustomersController)
  .use(RolesController)
  .use(PermissionsController)
  .as("global");

const systemGroup = new Elysia({ name: "@app/system-group" })
  .use(OrganizationsController)
  .use(WorkSchedulesController)
  .use(TerminalsController)
  .use(DeliveryPricingController)
  .use(ApiTokensController)
  .use(BrandsController)
  .use(DailyGarantController)
  .use(ManagerWithdrawController)
  .use(externalControler)
  .use(constructedBonusPricingController)
  .use(systemConfigsController)
  .use(chartControlller)
  .use(dashboardController)
  .use(OrderBonusPricingController)
  .as("global");

const ordersGroup = new Elysia({ name: "@app/orders-group" })
  .use(OrderStatusController)
  .use(OrdersController)
  .use(MissedOrdersController)
  .use(OrderActionsController)
  .use(orderTransactionsController)
  .as("global");

// Create the base API controller with explicit type annotation to prevent deep type instantiation
const apiController = new Elysia({
  name: "api",
})

// .use(UsersController)
  .use(userGroup)
  .use(systemGroup)
  .use(ordersGroup)
  .get("/api/check_service", () => ({
    result: "ok",
  }))
  .as("global")



export default apiController;

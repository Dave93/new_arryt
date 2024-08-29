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

// @ts-ignore
export const apiController = new Elysia({
  prefix: "/api",
  name: "api",
})

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
  .use(MissedOrdersController)
  .use(ManagerWithdrawController)
  .use(OrderActionsController)
  .use(externalControler)
  .use(constructedBonusPricingController)
  .use(systemConfigsController)

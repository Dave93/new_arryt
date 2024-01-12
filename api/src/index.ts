import { Elysia } from "elysia";
import Redis from "ioredis";
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
import { ManagerWithdrawController } from "./modules/manager_withdraw/controller";
import { Queue } from "bullmq";
import { SearchService } from "./services/search/service";
import { verifyJwt } from "./utils/bcrypt";
import { MissedOrdersController } from "./modules/missed_orders/controller";

export const client = new Redis({
    maxRetriesPerRequest: null,
    port: 6379,
    host: '127.0.0.1',
});

const cacheControl = new CacheControlService(db, client);

const searchService = new SearchService(cacheControl, db, client);

const newOrderNotify = new Queue(
    `${process.env.TASKS_PREFIX}_new_order_notify`,
    {
        connection: client,
    }
);

const processOrderIndexQueue = new Queue(
    `${process.env.TASKS_PREFIX}_process_order_index`,
    {
        connection: client,
    }
);


const processFromBasketToCouriers = new Queue(
    `${process.env.TASKS_PREFIX}_from_basket_to_couriers`,
    {
        connection: client,
    }
);

const processCheckAndSendYandex = new Queue(
    `${process.env.TASKS_PREFIX}_check_and_send_yandex`,
    {
        connection: client,
    }
);

const processUpdateUserCache = new Queue(
    `${process.env.TASKS_PREFIX}_update_user_cache`,
    {
        connection: client,
    }
);

const processOrderCompleteQueue = new Queue(
    `${process.env.TASKS_PREFIX}_order_complete`,
    {
        connection: client,
    }
);

const processOrderEcommerceWebhookQueue = new Queue(
    `${process.env.TASKS_PREFIX}_order_ecommerce_webhook`,
    {
        connection: client,
    }
);

const app = new Elysia()
    .use(cors())
    .use(bearer())
    .state("redis", client)
    .state("cacheControl", cacheControl)
    .state('searchService', searchService)
    .state('newOrderNotify', newOrderNotify)
    .state('processOrderIndexQueue', processOrderIndexQueue)
    .state('processFromBasketToCouriers', processFromBasketToCouriers)
    .state('processCheckAndSendYandex', processCheckAndSendYandex)
    .state('processUpdateUserCache', processUpdateUserCache)
    .state('processOrderCompleteQueue', processOrderCompleteQueue)
    .state('processOrderEcommerceWebhookQueue', processOrderEcommerceWebhookQueue)
    .state("davr_data", {
        test: "test",
    })
    .derive(async ({ bearer, store: { redis, cacheControl } }) => {
        const token = bearer;
        if (!token) {
            return {
                user: null,
            };
        }

        const apiTokens = await cacheControl.getApiTokens();
        const apiToken = apiTokens.find((apiToken) => apiToken.token === token);

        if (apiToken) {
            return {
                user: null
            };
        }
        try {
            let jwtResult = await verifyJwt(token);
            let userData = await redis.get(
                `${process.env.PROJECT_PREFIX}_user:${jwtResult.payload.id as string}`
            );
            if (userData) {
                userData = JSON.parse(userData);
                // @ts-ignore
                userData = userData;
            }
            return {
                user: userData,
            };

        } catch
        (error) {
            console.log('error', error)
            return {
                user: null
            };
        }
    })
    .get("/", () => "Hello Elysia")
    .get("/check_service", () => ({
        result: 'ok'
    }))
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
    .listen(process.env.API_PORT || 3000);

export type BackendApp = typeof app;

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

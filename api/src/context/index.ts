import { db } from "@api/src/lib/db";
import Elysia, { Context, error } from "elysia";
import { cors } from "@elysiajs/cors";
import { bearer } from "@elysiajs/bearer";
import Redis from "ioredis";
import { CacheControlService } from "@api/src/modules/cache/service";
import { Queue } from "bullmq";
import { verifyJwt } from "../utils/bcrypt";
import { SearchService } from "../services/search/service";
import { UserResponseDto } from "../modules/user/users.dto";

export const client = new Redis({
  port: 6379, // Redis port
  host: "127.0.0.1", // Redis host
  //   maxRetriesPerRequest: null,
});
export const cacheControlService = new CacheControlService(db, client);

const searchService = new SearchService(cacheControlService, db, client);

const newOrderNotify = new Queue(
  `${process.env.TASKS_PREFIX}_new_order_notify`,
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

const processOrderChangeStatusQueue = new Queue(
  `${process.env.TASKS_PREFIX}_order_change_status`,
  {
    connection: client,
  }
);

const processClearCourierQueue = new Queue(
  `${process.env.TASKS_PREFIX}_order_clear_courier`,
  {
    connection: client,
  }
);

const processOrderChangeCourierQueue = new Queue(
  `${process.env.TASKS_PREFIX}_order_change_courier`,
  {
    connection: client,
  }
);

const processCourierStoreLocationQueue = new Queue(
  `${process.env.TASKS_PREFIX}_courier_store_location`,
  {
    connection: client,
  }
);

const processYandexCallbackQueue = new Queue(
  `${process.env.TASKS_PREFIX}_yandex_callback`,
  {
    connection: client,
  }
);

const processSendNotificationQueue = new Queue(
  `${process.env.TASKS_PREFIX}_send_notification`,
  {
    connection: client,
  }
);

type DeriveUserResponse = {
  user: UserResponseDto | null;
};

export const ctx = new Elysia({
  name: "@app/ctx"
})
  .use(bearer())
  .decorate("redis", client)
  .decorate("drizzle", db)
  .decorate("cacheControl", cacheControlService)
  .decorate("searchService", searchService)
  .decorate("newOrderNotify", newOrderNotify)
  .decorate("processFromBasketToCouriers", processFromBasketToCouriers)
  .decorate("processCheckAndSendYandex", processCheckAndSendYandex)
  .decorate("processUpdateUserCache", processUpdateUserCache)
  .decorate("processOrderCompleteQueue", processOrderCompleteQueue)
  .decorate("processOrderChangeStatusQueue", processOrderChangeStatusQueue)
  .decorate("processClearCourierQueue", processClearCourierQueue)
  .decorate("processOrderChangeCourierQueue", processOrderChangeCourierQueue)
  .decorate("processCourierStoreLocationQueue", processCourierStoreLocationQueue)
  .decorate("processYandexCallbackQueue", processYandexCallbackQueue)
  .decorate("processSendNotificationQueue", processSendNotificationQueue)
  .decorate(
    "processOrderEcommerceWebhookQueue",
    processOrderEcommerceWebhookQueue
  )
  // @ts-ignore
  .derive({ as: 'global' }, async ({ bearer, redis, cacheControl }): Promise<DeriveUserResponse> => {
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
        user: null,
      };
    }
    try {
      let jwtResult = await verifyJwt(token);
      let userData = await redis.hget(
        `${process.env.PROJECT_PREFIX}_user`,
        jwtResult.payload.id as string
      );
      let userRes = null as {
        user: UserResponseDto;
        access: {
          additionalPermissions: string[];
          roles: {
            name: string;
            code: string;
            active: boolean;
          }[];
        };
      } | null;
      if (userData) {
        userRes = JSON.parse(userData);
      }
      return {
        user: userRes,
      };
    } catch (error) {
      console.log("error", error);
      return {
        user: null,
      };
    }
  }).as('global');


import { db } from "@api/src/lib/db";
import Elysia from "elysia";
import { bearer } from "@elysiajs/bearer";
import { CacheControlService } from "@api/src/modules/cache/service";
import { verifyJwt } from "../utils/bcrypt";
import { SearchService } from "../services/search/service";
import { UserResponseDto } from "../modules/user/users.dto";
import { client } from "./redis";
import { processFromBasketToCouriers, processCheckAndSendYandex, processUpdateUserCache, processOrderCompleteQueue, processOrderChangeStatusQueue, processClearCourierQueue, processOrderChangeCourierQueue, processStoreLocationQueue } from "./queues";


export const cacheControlService = new CacheControlService(db, client);

const searchService = new SearchService(cacheControlService, db, client);


type DeriveUserResponse = {
  user: {
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
};

const decorateApp = new Elysia({
  name: "@app/decorate",
})
  .decorate("redis", client)
  .decorate("drizzle", db)
  .decorate("cacheControl", cacheControlService)
  .decorate("searchService", searchService)
  .decorate("processFromBasketToCouriers", processFromBasketToCouriers)
  .decorate("processCheckAndSendYandex", processCheckAndSendYandex)
  .decorate("processUpdateUserCache", processUpdateUserCache)
  .decorate("processOrderCompleteQueue", processOrderCompleteQueue)
  .decorate("processOrderChangeStatusQueue", processOrderChangeStatusQueue)
  .decorate("processClearCourierQueue", processClearCourierQueue)
  .decorate("processOrderChangeCourierQueue", processOrderChangeCourierQueue)
  .decorate("processStoreLocationQueue", processStoreLocationQueue)
  .as('global');



export const ctx = new Elysia({
  name: "@app/ctx"
})
  .use(decorateApp)
  .use(bearer())
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


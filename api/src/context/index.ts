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
  .derive({ as: 'global' }, async ({ redis, cacheControl }): Promise<DeriveUserResponse> => {
    return {
      user: null,
    };
  })
  .macro(({ onBeforeHandle }) => ({
    permission(permission: string) {
      if (!permission) return;
      onBeforeHandle(async ({ redis, error, cacheControl, user, headers: { authorization } }) => {
        if (!authorization) {
          return error(401, {
            message: "Unauthorized",
          });
        }

        const token = authorization.split(' ')[1];
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

        if (!userRes) {
          return error(401, {
            message: "Unauthorized",
          });
        }

        if (!userRes.access.additionalPermissions.includes(permission)) {
          return error(403, {
            message: "Forbidden",
          });
        }

        user = userRes;
      })
    }
  }))
  .as('global');




export const contextWitUser = new Elysia({
  name: "@app/ctx"
})
  .use(decorateApp)
  .derive({ as: 'global' }, async ({ redis, cacheControl, headers: { authorization } }): Promise<DeriveUserResponse> => {
    if (!authorization) {
      return {
        user: null,
      }
    }

    const token = authorization.split(' ')[1];
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

    if (!userRes) {
      return {
        user: null,
      }
    }

    return {
      user: userRes,
    };
  })
  .macro(({ onBeforeHandle }) => ({
    permission(permission: string) {
      if (!permission) return;
      onBeforeHandle(async ({ redis, error, cacheControl, user, headers: { authorization } }) => {
        if (!authorization) {
          return error(401, {
            message: "Unauthorized",
          });
        }

        const token = authorization.split(' ')[1];
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

        if (!userRes) {
          return error(401, {
            message: "Unauthorized",
          });
        }

        if (!userRes.access.additionalPermissions.includes(permission)) {
          return error(403, {
            message: "Forbidden",
          });
        }

        user = userRes;
      })
    }
  }))
  .as('global');
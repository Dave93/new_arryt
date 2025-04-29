import {
  users_permissions,
  permissions as permissionsTable,
  roles,
  roles_permissions,
  users_roles,
  order_status,
  organization,
  terminals,
  delivery_pricing,
  api_tokens,
  users,
  users_terminals,
  constructed_bonus_pricing,
  work_schedules,
  daily_garant,
} from "../../../drizzle/schema";
import { DB } from "../../lib/db";
import { eq, getTableColumns, InferSelectModel, sql } from "drizzle-orm";
import { Redis } from "ioredis";
import { UserContext, UserResponseDto } from "../user/users.dto";
import { WorkScheduleWithRelations } from "../work_schedules/dto/list.dto";
import dayjs from "dayjs";
import { randomUUIDv7 } from "bun";
import ms from "ms";

export class CacheControlService {
  constructor(private readonly db: DB, private readonly redis: Redis) {
    this.cacheUsers();
    this.cacheOrganizations();
    this.cachePermissions();
    this.cacheTerminals();
    this.cacheDeliveryPricing();
    this.cacheWorkSchedules();
    this.cacheApiTokens();
    this.cacheBrands();
    this.cacheDailyGarant();
    this.cacheOrderBonusPricing();
    this.cacheRoles();
    this.cacheOrderStatus();
    this.cacheSystemConfigs();
    this.cacheConstructedBonusPricing();
  }

  async cacheUsers() {
    const users = await this.db.query.users.findMany();
    const users_terminals = await this.db.query.users_terminals.findMany();
    const permissions = await this.db
      .select({
        permission_slug: permissionsTable.slug,
        user_id: users_permissions.user_id,
      })
      .from(users_permissions)
      .leftJoin(
        permissionsTable,
        eq(users_permissions.permission_id, permissionsTable.id)
      );

    const userRoles = await this.db
      .select({
        permission_slug: permissionsTable.slug,
        role_name: roles.name,
        role_code: roles.code,
        role_active: roles.active,
        role_id: roles.id,
        user_id: users_roles.user_id,
      })
      .from(users_roles)
      .leftJoin(roles, eq(users_roles.role_id, roles.id))
      .leftJoin(roles_permissions, eq(roles.id, roles_permissions.role_id))
      .leftJoin(
        permissionsTable,
        eq(roles_permissions.permission_id, permissionsTable.id)
      );
    for (let user of users) {
      let userData: {
        user: UserResponseDto;
        access: {
          additionalPermissions: string[];
          roles: {
            name: string;
            code: string;
            active: boolean;
          }[];
        };
      } = {
        user: {
          id: user!.id,
          phone: user!.phone,
          first_name: user!.first_name || "",
          last_name: user!.last_name || "",
          status: user!.status,
          is_super_user: user!.is_super_user,
          is_online: user!.is_online,
          wallet_balance: user!.wallet_balance,
          api_token: (await user!.api_token) || "",
          daily_garant_id: user!.daily_garant_id || "",
          terminal_id: users_terminals
            .filter((terminal) => terminal.user_id === user.id)
            .map((t) => t.terminal_id),
        },
        access: {
          additionalPermissions: [],
          roles: [],
        },
      };
      let additionalPermissions = permissions
        .filter((permission) => permission.user_id === user.id)
        .map(({ permission_slug }) => permission_slug!);
      const rolePermissions: string[] = [];
      userRoles
        .filter((role) => role.user_id === user.id)
        .forEach(({ permission_slug }) => {
          rolePermissions.push(permission_slug!);
        });
      additionalPermissions = [...additionalPermissions, ...rolePermissions];
      userData.access.additionalPermissions = additionalPermissions;
      const rolesList: {
        [key: string]: {
          name: string;
          code: string;
          active: boolean;
        };
      } = {};

      userRoles
        .filter((role) => role.user_id === user.id && role.role_id)
        .forEach(({ role_name, role_code, role_active, role_id }) => {
          if (role_id)
            rolesList[role_id] = {
              name: role_name!,
              code: role_code!,
              active: role_active!,
            };
        });
      userData.access.roles = Object.values(rolesList);

      await this.redis.hset(
        `${process.env.PROJECT_PREFIX}_user`,
        user.id,
        JSON.stringify(userData)
      );
    }
  }

  async cacheUser(id: string) {
    const user = (
      await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    )[0];
    const usersTerminalsList = await this.db
      .select()
      .from(users_terminals)
      .where(eq(users_terminals.user_id, id));
    const permissions = await this.db
      .select({
        permission_slug: permissionsTable.slug,
        user_id: users_permissions.user_id,
      })
      .from(users_permissions)
      .leftJoin(
        permissionsTable,
        eq(users_permissions.permission_id, permissionsTable.id)
      )
      .where(eq(users_permissions.user_id, id));

    const userRoles = await this.db
      .select({
        permission_slug: permissionsTable.slug,
        role_name: roles.name,
        role_code: roles.code,
        role_active: roles.active,
        role_id: roles.id,
        user_id: users_roles.user_id,
      })
      .from(users_roles)
      .leftJoin(roles, eq(users_roles.role_id, roles.id))
      .leftJoin(roles_permissions, eq(roles.id, roles_permissions.role_id))
      .leftJoin(
        permissionsTable,
        eq(roles_permissions.permission_id, permissionsTable.id)
      )
      .where(eq(users_roles.user_id, id));
    let userData: {
      user: UserResponseDto;
      access: {
        additionalPermissions: string[];
        roles: {
          name: string;
          code: string;
          active: boolean;
        }[];
      };
    } = {
      user: {
        id: user!.id,
        phone: user!.phone,
        first_name: user!.first_name || "",
        last_name: user!.last_name || "",
        status: user!.status,
        is_super_user: user!.is_super_user,
        is_online: user!.is_online,
        wallet_balance: user!.wallet_balance,
        api_token: (await user!.api_token) || "",
        daily_garant_id: user!.daily_garant_id || "",
        terminal_id: usersTerminalsList
          .filter((terminal) => terminal.user_id === user.id)
          .map((t) => t.terminal_id),
      },
      access: {
        additionalPermissions: [],
        roles: [],
      },
    };
    let additionalPermissions = permissions.map(
      ({ permission_slug }) => permission_slug!
    );
    const rolePermissions: string[] = [];
    userRoles.forEach(({ permission_slug }) => {
      rolePermissions.push(permission_slug!);
    });
    additionalPermissions = [...additionalPermissions, ...rolePermissions];
    userData.access.additionalPermissions = additionalPermissions;
    const rolesList: {
      [key: string]: {
        name: string;
        code: string;
        active: boolean;
      };
    } = {};

    userRoles.forEach(({ role_name, role_code, role_active, role_id }) => {
      if (role_id)
        rolesList[role_id] = {
          name: role_name!,
          code: role_code!,
          active: role_active!,
        };
    });
    userData.access.roles = Object.values(rolesList);

    await this.redis.hset(
      `${process.env.PROJECT_PREFIX}_user`,
      user.id,
      JSON.stringify(userData)
    );
  }

  async cacheOrganizations() {
    const organizations = await this.db.query.organization.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_organizations`,
      JSON.stringify(organizations)
    );
  }

  async cachePermissions() {
    const permissions = await this.db.query.permissions.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_permissions`,
      JSON.stringify(permissions)
    );
  }

  async cacheTerminals() {
    const terminalsList = await this.db.select({
      ...getTableColumns(terminals),
      organization: {
        name: organization.name,
        icon_url: organization.icon_url,
      },
    }).from(terminals).leftJoin(organization, eq(terminals.organization_id, organization.id));
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_terminals`,
      JSON.stringify(terminalsList)
    );
  }

  async cacheDeliveryPricing() {
    const deliveryPricing = await this.db.query.delivery_pricing.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_delivery_pricing`,
      JSON.stringify(deliveryPricing)
    );
  }

  async cacheWorkSchedules() {

    const workSchedules = await this.db
      .select({
        ...getTableColumns(work_schedules),
        organization: {
          ...getTableColumns(organization),
        },
      })
      .from(work_schedules)
      .leftJoin(
        organization,
        eq(work_schedules.organization_id, organization.id)
      )
      .execute()
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_work_schedules`,
      JSON.stringify(workSchedules)
    );
  }

  async cacheApiTokens() {
    const apiTokens = await this.db.query.api_tokens.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_api_tokens`,
      JSON.stringify(apiTokens)
    );
  }

  async cacheBrands() {
    const brands = await this.db.query.brands.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_brands`,
      JSON.stringify(brands)
    );
  }

  async cacheDailyGarant() {
    const dailyGarant = await this.db.query.daily_garant.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_daily_garant`,
      JSON.stringify(dailyGarant)
    );
  }

  async cacheOrderBonusPricing() {
    const orderBonusPricing =
      await this.db.query.order_bonus_pricing.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_order_bonus_pricing`,
      JSON.stringify(orderBonusPricing)
    );
  }

  async cacheRoles() {
    const roles = await this.db.query.roles.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_roles`,
      JSON.stringify(roles)
    );
  }

  async cacheOrderStatus() {
    const orderStatus = await this.db
      .select()
      .from(order_status)
      .leftJoin(
        organization,
        eq(order_status.organization_id, organization.id)
      );

    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_order_status`,
      JSON.stringify(
        orderStatus.map((status) => ({
          ...status.order_status,
          organization: status.organization,
        }))
      )
    );
  }

  async cacheSystemConfigs() {
    const systemConfigs = await this.db.query.system_configs.findMany();
    const res: {
      [key: string]: any;
    } = {};
    systemConfigs.forEach((config) => {
      res[config.name] = config.value;
    });
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_system_configs`,
      JSON.stringify(res)
    );
  }

  async cacheConstructedBonusPricing() {
    const constructedBonusPricing =
      await this.db.query.constructed_bonus_pricing.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_constructed_bonus_pricing`,
      JSON.stringify(constructedBonusPricing)
    );
  }

  async getApiTokens() {
    const apiTokens = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_api_tokens`
    );
    return JSON.parse(apiTokens || "[]") as InferSelectModel<
      typeof api_tokens
    >[];
  }

  async getSetting(key: string) {
    const configs = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_system_configs`
    );
    const res = JSON.parse(configs || "[]") as any;
    return res[key];
  }

  async getSettingsByRegex(regex: string) {
    const configs = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_system_configs`
    );
    const res = JSON.parse(configs || "[]") as any;
    const result: {
      [key: string]: any;
    } = {};
    for (const key in res) {
      if (key.match(regex)) {
        result[key] = res[key];
      }
    }
    return result;
  }

  async getOrderStatuses() {
    const orderStatuses = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_order_status`
    );
    return JSON.parse(orderStatuses || "[]") as InferSelectModel<
      typeof order_status
    >[];
  }

  async getUser(id: string) {
    const user = await this.redis.hget(
      `${process.env.PROJECT_PREFIX}_user`,
      id
    );
    return JSON.parse(user || "{}") as {
      user: UserResponseDto;
      access: {
        additionalPermissions: string[];
        roles: {
          name: string;
          code: string;
          active: boolean;
        }[];
      };
    };
  }

  async getOrganizations() {
    const organizations = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_organizations`
    );
    return JSON.parse(organizations || "[]") as InferSelectModel<
      typeof organization
    >[];
  }

  async getPermissions() {
    const permissions = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_permissions`
    );
    return JSON.parse(permissions || "[]") as InferSelectModel<
      typeof permissionsTable
    >[];
  }

  async getTerminals() {
    const terminalsList = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_terminals`
    );
    return JSON.parse(terminalsList || "[]") as (typeof terminals.$inferSelect & { organization: { name: string, icon_url: string } })[];
  }

  async getOrganizationDeliveryPricing(organizationId: string) {
    const deliveryPricing = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_delivery_pricing`
    );
    return JSON.parse(deliveryPricing || "[]").filter(
      (pricing: any) => pricing.organization_id === organizationId
    ) as (typeof delivery_pricing.$inferSelect)[];
  }

  async getOrganization(organizationId: string) {
    const organizations = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_organizations`
    );
    return JSON.parse(organizations || "[]").find(
      (organization: any) => organization.id === organizationId
    ) as InferSelectModel<typeof organization>;
  }

  async getDeliveryPricingById(delivery_pricing_id: string) {
    const deliveryPricing = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_delivery_pricing`
    );
    return JSON.parse(deliveryPricing || "[]").find(
      (pricing: any) => pricing.id === delivery_pricing_id
    ) as InferSelectModel<typeof delivery_pricing>;
  }

  async getConstructedBonusPricingByOrganization(organizationId: string) {
    const constructedBonusPricing = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_constructed_bonus_pricing`
    );
    return JSON.parse(constructedBonusPricing || "[]").find(
      (pricing: any) => pricing.organization_id === organizationId
    ) as InferSelectModel<typeof constructed_bonus_pricing>;
  }

  async getWorkSchedules() {
    const workSchedules = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_work_schedules`
    );
    return JSON.parse(workSchedules || "[]") as WorkScheduleWithRelations[];
  }

  async getDailyGarant() {
    const dailyGarant = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_daily_garant`
    );
    return JSON.parse(dailyGarant || "[]") as InferSelectModel<typeof daily_garant>[];
  }

  async getNextQueueCourier(terminal_id: string, drive_type: string, skipCourierId?: string) {

    let skipCourierIds = [];
    if (skipCourierId) {
      skipCourierIds.push(skipCourierId);
    }
    const terminals = await this.getTerminals();
    const terminal = terminals.find((t) => t.id === terminal_id);
    if (!terminal) {
      return null;
    }

    const workStartTime = await this.getSetting('work_start_time');
    const workEndTime = await this.getSetting('work_end_time');

    let queueKey = `${process.env.PROJECT_PREFIX}_order_queue`;
    let lastCourierKey = `${process.env.PROJECT_PREFIX}_last_courier`;

    if (drive_type === 'foot') {
      queueKey += '_foot';
      lastCourierKey += '_foot';
    }

    let queueTerminals = [terminal_id];
    if (terminal.linked_terminal_id) {
      const linkedTerminal = terminals.find((t) => t.id === terminal.linked_terminal_id);
      if (linkedTerminal) {
        queueTerminals.push(linkedTerminal.id);
      }
    }

    const orderStatuses = await this.getOrderStatuses();
    const finishOrderStatuses = orderStatuses.filter((status) => status.finish || status.cancel).map((status) => status.id);
    queueKey += `_${queueTerminals.sort().join('_')}`;
    lastCourierKey += `_${queueTerminals.sort().join('_')}`;

    const currentTime = new Date().getHours();
    const currentDate = currentTime < Number(workEndTime)
      ? new Date(Date.now() - 86400000).toISOString().split('T')[0].replace(/-/g, '_')
      : new Date().toISOString().split('T')[0].replace(/-/g, '_');

    queueKey += `_${currentDate}`;
    lastCourierKey += `_${currentDate}`;

    const lastCourierId = await this.redis.get(lastCourierKey);
    let courierQueue = await this.redis.lrange(queueKey, 0, -1);

    if (!courierQueue.length) {
      return null;
    }

    const sqlStartDateTime = sql.raw(`${dayjs().subtract(6, 'hours').format('YYYY_MM_DD')} 00:00:00`);
    const sqlEndDateTime = sql.raw(`${dayjs().format('YYYY_MM_DD')} 04:00:00`);
    const terminalIds = sql.raw(queueTerminals.map((id) => `'${id}'`).join(','));
    const busyCourierIds = (await this.db.execute<{ courier_id: string }>(
      sql`select courier_id 
        from orders 
        where order_status_id not in (${finishOrderStatuses}) 
        and courier_id is not null 
        and created_at >= '${sqlStartDateTime}' 
        and created_at <= '${sqlEndDateTime}' 
        and terminal_id in (${terminalIds}) 
        group by courier_id`
    )).rows;

    console.log(busyCourierIds);

    if (busyCourierIds.length > 0) {
      skipCourierIds = [...skipCourierIds, ...busyCourierIds.map((courier) => courier.courier_id)];
    }

    // Remove the courier to skip from the queue if provided
    if (skipCourierIds.length > 0) {
      courierQueue = courierQueue.filter(id => !skipCourierIds.includes(id));
    }

    if (courierQueue.length === 0) {
      return null;
    }

    const lastCourierIndex = courierQueue.findIndex(id => id === lastCourierId);

    if (lastCourierIndex === -1 || lastCourierIndex === courierQueue.length - 1) {
      // If last courier not found or is the last in queue, return the first courier
      return courierQueue[0];
    } else {
      // Return the next courier in the queue
      return courierQueue[lastCourierIndex + 1];
    }
  }

  async getCourierFcmToken(courierId: string) {
    const courier = await this.db.select().from(users).where(eq(users.id, courierId)).limit(1);
    return courier[0].fcm_token;
  }

  async setUserSession(userData: UserContext, oldRefreshToken: string | null = null) {
    const accessToken = randomUUIDv7();
    const refreshToken = randomUUIDv7();
    await this.redis.set(`${process.env.PROJECT_PREFIX}:session:${accessToken}`, JSON.stringify(userData), "PX", ms("2 days"));

    if (oldRefreshToken) {
        await this.redis.del(`${process.env.PROJECT_PREFIX}:session:${oldRefreshToken}`);
    }

    await this.redis.set(`${process.env.PROJECT_PREFIX}:session:${refreshToken}`, JSON.stringify(userData), "PX", ms("7 days"));

    return {
        accessToken,
        refreshToken
    };
  }

  async clearUserSession(accessToken: string, refreshToken: string) {
    await this.redis.del(`${process.env.PROJECT_PREFIX}:session:${accessToken}`);
    await this.redis.del(`${process.env.PROJECT_PREFIX}:session:${refreshToken}`);
  }
}

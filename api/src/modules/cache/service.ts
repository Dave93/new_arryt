import {
  users_permissions,
  permissions as permissionsTable,
  roles,
  roles_permissions,
  users_roles,
  order_status,
  organization, terminals, delivery_pricing, api_tokens, users, users_terminals, constructed_bonus_pricing,
} from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { eq, InferSelectModel } from "drizzle-orm";
import { Redis } from "ioredis";
import { UserResponseDto } from "../user/users.dto";

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

      await this.redis.set(
        `${process.env.PROJECT_PREFIX}_user:${user.id}`,
        JSON.stringify(userData)
      );
    }
  }

  async cacheUser(id: string) {
    const user = (await this.db.select().from(users).where(eq(users.id, id)).limit(1))[0];
    const usersTerminalsList = await this.db.select().from(users_terminals).where(eq(users_terminals.user_id, id));
    const permissions = await this.db
      .select({
        permission_slug: permissionsTable.slug,
        user_id: users_permissions.user_id,
      })
      .from(users_permissions)
      .leftJoin(
        permissionsTable,
        eq(users_permissions.permission_id, permissionsTable.id)
      ).where(eq(users_permissions.user_id, id));

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
    let additionalPermissions = permissions
      .map(({ permission_slug }) => permission_slug!);
    const rolePermissions: string[] = [];
    userRoles
      .forEach(({ permission_slug }) => {
        rolePermissions.push(permission_slug!);
      }
      );
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
      .forEach(({ role_name, role_code, role_active, role_id }) => {
        if (role_id)
          rolesList[role_id] = {
            name: role_name!,
            code: role_code!,
            active: role_active!,
          };
      });
    userData.access.roles = Object.values(rolesList);

    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_user:${user.id}`,
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
    const terminals = await this.db.query.terminals.findMany();
    await this.redis.set(
      `${process.env.PROJECT_PREFIX}_terminals`,
      JSON.stringify(terminals)
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
    const workSchedules = await this.db.query.work_schedules.findMany();
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
    return JSON.parse(apiTokens || "[]") as InferSelectModel<typeof api_tokens>[];
  }

  async getOrderStatuses() {
    const orderStatuses = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_order_status`
    );
    return JSON.parse(orderStatuses || "[]") as InferSelectModel<typeof order_status>[];
  }

  async getUser(id: string) {
    const user = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_user:${id}`
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
    return JSON.parse(organizations || "[]") as InferSelectModel<typeof organization>[];
  }

  async getPermissions() {
    const permissions = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_permissions`
    );
    return JSON.parse(permissions || "[]") as InferSelectModel<typeof permissionsTable>[];
  }

  async getTerminals() {
    const terminalsList = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_terminals`
    );
    return JSON.parse(terminalsList || "[]") as InferSelectModel<typeof terminals>[];
  }

  async getOrganizationDeliveryPricing(organizationId: string) {
    const deliveryPricing = await this.redis.get(
      `${process.env.PROJECT_PREFIX}_delivery_pricing`
    );
    return JSON.parse(deliveryPricing || "[]").filter(
      (pricing: any) => pricing.organization_id === organizationId
    ) as InferSelectModel<typeof delivery_pricing>[];
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
}

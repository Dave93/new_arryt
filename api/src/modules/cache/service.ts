import {
  users_permissions,
  permissions as permissionsTable,
  roles,
  roles_permissions,
  users_roles,
  order_status,
  organization,
} from "@api/drizzle/schema";
import { DB } from "@api/src/lib/db";
import { eq } from "drizzle-orm";
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
}

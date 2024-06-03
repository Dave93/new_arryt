import { verifyJwt } from "./bcrypt";
export const checkRestPermission = async ({
  set,
  request: { headers },
  store: { redis },
  permission,
  bearer
}: any & {
  permission?: string;
}) => {
  const token = bearer;
  if (!token) {
    set.status = 401;

    return `Unauthorized`;
  }

  if (!permission) {
    set.status = 403;

    return `Forbidden`;
  }
  if (permission) {
    let jwtResult = await verifyJwt(token);
    if (!jwtResult) {
      set.status = 401;

      return `Unauthorized`;
    }

    if (!jwtResult.payload) {
      set.status = 401;

      return `Unauthorized`;
    }

    let userData = await redis.hget(
      `${process.env.PROJECT_PREFIX}_user`,
      jwtResult.payload.id as string
    );
    // let user = await usersService.findOne({
    //   where: {
    //     id: jwtResult.payload.id as string,
    //   },
    //   include: {
    //     users_roles_usersTousers_roles_user_id: true,
    //   },
    // });

    try {
      userData = JSON.parse(userData);
    } catch (error) {
      set.status = 403;

      return `Forbidden`;
    }

    if (!userData) {
      set.status = 401;

      return `Unauthorized`;
    }
    console.log(jwtResult.payload.id);
    const permissions = userData?.access?.additionalPermissions ?? [];
    console.log(permissions);
    console.log("permission", permission);
    if (permissions.length === 0) {
      set.status = 403;

      return `Forbidden`;
    }

    if (!permissions.includes(permission)) {
      set.status = 403;

      return `Forbidden`;
    }

    // if (ctx.permissionsService.hasPermission(meta.permission)) {
    //   return next();
    // } else {
    //   throw new Error("No permission");
    // }
  }
};

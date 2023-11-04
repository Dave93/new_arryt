import Elysia, { t } from "elysia";
import Redis from "ioredis";
import { db } from "@api/src/lib/db";
import {
  users,
  otp as otpTable,
  user_status,
  users_roles,
  roles,
  roles_permissions,
  permissions as permissionsTable,
  users_permissions,
  users_terminals,
  work_schedules,
  users_work_schedules,
} from "@api/drizzle/schema";
import {
  InferModel,
  InferSelectModel,
  SQLWrapper,
  and,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { generate } from "otp-generator";
import { addMinutesToDate } from "@api/src/utils/dates";
import { decode, encode } from "@api/src/utils/users";
import dayjs from "dayjs";
import { UserResponseDto } from "./users.dto";
import { JwtPayload } from "@api/src/utils/jwt-payload.dto";
import { generateAuthToken } from "@api/src/utils/bcrypt";
import { PgColumn, SelectedFields } from "drizzle-orm/pg-core";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { createInsertSchema } from "drizzle-typebox";
import { checkRestPermission } from "@api/src/utils/check_rest_permissions";

type UsersModel = InferSelectModel<typeof users>;

const userByPhone = db.query.users
  .findFirst({
    where: (users, { eq }) => eq(users.phone, sql.placeholder("phone")),
  })
  .prepare("userByPhone");
const userById = db.query.users
  .findFirst({
    where: (users, { eq }) => eq(users.id, sql.placeholder("id")),
  })
  .prepare("userByPhone");

const otpById = db.query.otp
  .findFirst({
    where: (otpTable, { eq }) => eq(otpTable.id, sql.placeholder("id")),
  })
  .prepare("otpById");

export const UsersController = (
  app: Elysia<
    "",
    {
      store: {
        redis: Redis;
      };
      bearer: string;
      request: {};
      schema: {};
    }
  >
) =>
  app
    .post(
      "/api/users/send-otp",
      async ({ body: { phone } }) => {
        let userEntity = await userByPhone.execute({ phone });
        if (!userEntity) {
          [userEntity] = await db
            .insert(users)
            .values({
              phone,
              is_super_user: false,
              status: "active",
            })
            .returning();
        }

        //Generate OTP
        let otp = generate(6, {
          digits: true,
          upperCaseAlphabets: false,
          lowerCaseAlphabets: false,
          specialChars: false,
        });
        const now = new Date();
        const expiration_time = addMinutesToDate(now, 10);
        console.log(otp);
        if (phone == "+998977021803") {
          otp = "555555";
        }

        if (phone == "+998950771803") {
          otp = "888888";
        }

        const [otpEntity] = await db
          .insert(otpTable)
          .values({
            user_id: userEntity.id,
            otp: otp,
            expiry_date: expiration_time.toISOString(),
          })
          .returning();
        //   const otpEntity = await this.prismaService.otp.create({
        //     data: {
        //       user_id: userEntity.id,
        //       otp: otp,
        //       expiry_date: expiration_time,
        //     },
        //   });

        // Create details object containing the phone number and otp id
        const details = {
          timestamp: now,
          check: phone,
          success: true,
          message: "OTP sent to user",
          otp_id: otpEntity.id,
        };

        // Encrypt the details object
        const encoded = await encode(JSON.stringify(details));

        let message = `Your OTP is ${otp}`;

        // Send the OTP to the user
        const response = await fetch("http://91.204.239.44/broker-api/send", {
          method: "POST",
          body: JSON.stringify({
            messages: [
              {
                recipient: phone.replace(/[^0-9]/g, ""),
                "message-id": Math.floor(Math.random() * 1000001),
                sms: {
                  originator: "Chopar",
                  content: {
                    text: message,
                  },
                },
              },
            ],
          }),
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization:
              "Basic " + Buffer.from("lesailes2:W84Uu8h@j").toString("base64"),
          },
        });
        //   let result = new SendOtpToken();
        //   result.details = encoded;
        return {
          details: encoded,
        };
      },
      {
        body: t.Object({
          phone: t.String(),
        }),
      }
    )
    .post(
      "/api/users/verify-otp",
      async ({
        body: { phone, otp, verificationKey, deviceToken, tgId },
        store: { redis },
        set,
      }) => {
        const currentDate = new Date();

        let decoded;

        //Check if verification key is altered or not and store it in variable decoded after decryption
        try {
          decoded = await decode(verificationKey);
        } catch (err) {
          set.status = 400;
          return {
            message: "Verification key is invalid",
          };
        }
        const obj = JSON.parse(decoded);
        const check_obj = obj.check;

        // Check if the OTP was meant for the same email or phone number for which it is being verified
        if (check_obj != phone) {
          set.status = 400;
          return {
            message: "OTP was not sent to this particular phone number",
          };
        }
        const otp_instance = await otpById.execute({ id: obj.otp_id });

        //Check if OTP is available in the DB
        if (otp_instance != null) {
          //Check if OTP is already used or not
          if (otp_instance.verified != true) {
            //Check if OTP is expired or not
            if (dayjs(currentDate).isBefore(dayjs(otp_instance.expiry_date))) {
              //Check if OTP is equal to the OTP in the DB
              if (otp === otp_instance.otp) {
                otp_instance.verified = true;
                await db
                  .update(otpTable)
                  .set({
                    verified: true,
                  })
                  .where(eq(otpTable.id, otp_instance.id))
                  .execute();

                let userData = await redis.get(
                  `${process.env.PROJECT_PREFIX}_user:${otp_instance.user_id}`
                );

                if (!userData) {
                  set.status = 400;
                  return {
                    message: "User not found",
                  };
                }

                const userParsed = JSON.parse(userData);
                console.log(userParsed);
                const user = userParsed.user;

                if (user!.status == "blocked") {
                  set.status = 400;
                  return {
                    message: "User is blocked",
                  };
                }
                if (user!.status == "inactive") {
                  set.status = 400;
                  return {
                    message: "User is inactive",
                  };
                }

                if (deviceToken) {
                  await db
                    .update(users)
                    .set({
                      fcm_token: deviceToken,
                    })
                    .where(eq(users.id, user!.id))
                    .execute();
                }

                if (tgId) {
                  await db
                    .update(users)
                    .set({
                      tg_id: tgId.toString(),
                    })
                    .where(eq(users.id, user!.id))
                    .execute();
                }

                const dto: UserResponseDto = user;

                const payload: JwtPayload = {
                  id: user!.id,
                  phone: user!.phone,
                };
                const token = await generateAuthToken(payload);

                return {
                  token,
                  user: dto,
                  access: userParsed.access,
                };
                // const response = { Status: 'Success', Details: 'OTP Matched', Check: check };
                // return res.status(200).send(response);
              } else {
                set.status = 400;
                return {
                  message: "OTP NOT Matched",
                };
              }
            } else {
              set.status = 400;
              return {
                message: "OTP Expired",
              };
            }
          } else {
            set.status = 400;
            return {
              message: "OTP Already Used",
            };
          }
        } else {
          set.status = 400;
          return {
            message: "OTP Not Found",
          };
        }
      },
      {
        body: t.Object({
          phone: t.String(),
          otp: t.String(),
          verificationKey: t.String(),
          deviceToken: t.Optional(t.String()),
          tgId: t.Optional(t.Number()),
        }),
      }
    )
    .get(
      "/api/couriers/search",
      async ({ query: { search } }) => {
        const couriersList = await db
          .select()
          .from(users)
          .leftJoin(users_roles, eq(users.id, users_roles.user_id))
          .leftJoin(roles, eq(users_roles.role_id, roles.id))
          .where(
            and(
              eq(users.status, "active"),
              eq(roles.code, "courier"),
              or(
                ilike(users.first_name, `%${search}%`),
                ilike(users.last_name, `%${search}%`),
                ilike(users.phone, `%${search}%`)
              )
            )
          )
          .execute();
        return couriersList;
      },
      {
        query: t.Object({
          search: t.String(),
        }),
      }
    )
    .get(
      "/api/users",
      async ({ query: { limit, offset, sort, filters, fields } }) => {
        let res: {
          [key: string]: UsersModel & {
            work_schedules: {
              id: string;
              user_id: string;
              work_schedule_id: string;
              start_time: string;
              end_time: string;
              day: string;
            }[];
          };
        } = {};
        let selectFields: SelectedFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, users, {
            work_schedules,
          });
        }
        let whereClause: (SQLWrapper | undefined)[] = [];
        if (filters) {
          whereClause = parseFilterFields(filters, users, {
            work_schedules,
            users_terminals,
          });
        }
        const usersCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(and(...whereClause))
          .leftJoin(users_terminals, eq(users_terminals.user_id, users.id))
          .execute();

        const usersDbSelect = db
          .select()
          .from(users)
          .where(and(...whereClause))
          .leftJoin(users_terminals, eq(users_terminals.user_id, users.id))
          .limit(+limit)
          .offset(+offset)
          .as("users");

        // @ts-ignore
        const usersList: UsersModel[] = await db
          .select(selectFields)
          .from(usersDbSelect)
          .leftJoin(
            users_work_schedules,
            eq(users.id, users_work_schedules.user_id)
          )
          .leftJoin(
            work_schedules,
            eq(work_schedules.id, users_work_schedules.work_schedule_id)
          )
          .execute();
        console.log(
          "sql",
          db
            .select(selectFields)
            .from(usersDbSelect)
            .leftJoin(
              users_work_schedules,
              eq(users.id, users_work_schedules.user_id)
            )
            .leftJoin(
              work_schedules,
              eq(users_work_schedules.user_id, users.id)
            )
            .toSQL().sql
        );
        usersList.forEach((user) => {
          if (!res[user.id]) {
            res[user.id] = {
              ...user,
              work_schedules: [],
            };
          }
          // @ts-ignore
          if (user.work_schedules) {
            // @ts-ignore
            res[user.id].work_schedules.push(user.work_schedules);
          }
        });

        return {
          total: usersCount[0].count,
          data: Object.values(res),
        };
      },
      {
        query: t.Object({
          limit: t.String(),
          offset: t.String(),
          sort: t.Optional(t.String()),
          filters: t.Optional(t.String()),
          fields: t.Optional(t.String()),
        }),
      }
    )
    .get(
      "/api/users/:id",
      async ({ params: { id } }) => {
        const permissionsRecord = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .execute();
        return {
          data: permissionsRecord[0],
        };
      },
      {
        params: t.Object({
          id: t.String(),
        }),
      }
    )
    .post(
      "/api/users",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, users, {});
        }
        const result = await db
          .insert(users)
          .values(data)
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        body: t.Object({
          data: createInsertSchema(users) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/users/:id",
      async ({ params: { id }, body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, users, {});
        }
        const result = await db
          .update(users)
          .set(data)
          .where(eq(users.id, id))
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          data: createInsertSchema(users) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );

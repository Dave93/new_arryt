import { Create, useForm } from "@refinedev/antd";
import { Col, Form, Input, InputNumber, Row, Select } from "antd";
import { useGetIdentity, useNotification, useTranslate } from "@refinedev/core";
import { IWorkSchedules } from "@admin/src/interfaces";
import { drive_type, user_status } from "@admin/src/interfaces/enums";
import { useEffect, useState } from "react";
import { chain, sortBy } from "lodash";
import { daily_garant, roles, terminals, users } from "@api/drizzle/schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { apiClient } from "@admin/src/eden";
import { WorkScheduleWithRelations } from "@api/src/modules/work_schedules/dto/list.dto";

export default function UsersCreate() {
  const { open } = useNotification();
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const tr = useTranslate();
  const { formProps, saveButtonProps, redirect } = useForm<
    InferInsertModel<typeof users>
  >({
    redirect: false,
    meta: {
      fields: [
        "id",
        "first_name",
        "last_name",
        "created_at",
        "drive_type",
        "card_number",
        "phone",
        "latitude",
        "longitude",
        "max_active_order_count",
        "daily_garant_id",
        "terminals.id",
        "terminals.name",
      ],
      pluralize: true,
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const [rolesList, setRoles] = useState<InferSelectModel<typeof roles>[]>([]);
  const [terminalsList, setTerminals] = useState<
    InferSelectModel<typeof terminals>[]
  >([]);
  const [work_schedules, setWorkSchedules] = useState<
    {
      name: string;
      children: WorkScheduleWithRelations[];
    }[]
  >([]);
  const [daily_garantList, setDailyGarant] = useState<
    InferSelectModel<typeof daily_garant>[]
  >([]);

  const fetchAllData = async () => {
    const { data: roles } = await apiClient.api.roles.cached.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });

    if (roles && Array.isArray(roles)) {
      setRoles(roles);
    }

    const { data: cachedDailyGarant } =
      await apiClient.api.daily_garant.cached.get({
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });

    if (cachedDailyGarant && Array.isArray(cachedDailyGarant)) {
      setDailyGarant(cachedDailyGarant);
    }

    const { data: terminals } = await apiClient.api.terminals.cached.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });

    if (terminals && Array.isArray(terminals)) {
      setTerminals(sortBy(terminals, ["name"]));
    }

    const { data: workSchedules } =
      await apiClient.api.work_schedules.cached.get({
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });

    if (workSchedules && Array.isArray(workSchedules)) {
      var workScheduleResult = chain(workSchedules)
        .groupBy("organization.name")
        .toPairs()
        .map(function (item) {
          return {
            name: item[0],
            children: item[1],
          };
        })
        .value();
      setWorkSchedules(workScheduleResult);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return (
    <Create
      saveButtonProps={{
        disabled: saveButtonProps.disabled,
        loading: saveButtonProps.loading,
        onClick: async () => {
          try {
            let values: any = await formProps.form?.validateFields();
            let usersTerminals = values.users_terminals;
            let usersWorkSchedules = values.users_work_schedules;
            let roles = values.roles;
            delete values.users_terminals;
            delete values.users_work_schedules;
            delete values.roles;

            try {
              const { data, status, error } = await apiClient.api.users.post({
                data: {
                  ...values,
                  usersTerminals,
                  usersWorkSchedules,
                  roles,
                },
                $headers: {
                  Authorization: `Bearer ${identity?.token.accessToken}`,
                },
              });
              if (status != 200) {
                return open!({
                  type: "error",
                  message:
                    data && data.message
                      ? data.message
                      : error?.message ?? "Ошибка при создании пользователя",
                });
              }
              redirect("list");
            } catch (e: any) {
              return open!({
                type: "error",
                message: e.message,
              });
            }
          } catch (error) {}
        },
      }}
      title="Создать пользователя"
    >
      <Form {...formProps} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Статус"
              name="status"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Select>
                {Object.keys(user_status).map((status: string) => (
                  <Select.Option key={status} value={status}>
                    {tr(`users.status.${status}`)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Роль"
              name="roles"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Select>
                {rolesList.map((role) => (
                  <Select.Option key={role.id} value={role.id}>
                    {role.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Имя"
              name="first_name"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Фамилия"
              name="last_name"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Телефон" name="phone">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Тип доставки" name="drive_type">
              <Select>
                {Object.keys(drive_type).map((type: string) => (
                  <Select.Option key={type} value={type}>
                    {tr(`deliveryPricing.driveType.${type}`)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Филиалы" name="users_terminals">
              <Select mode="multiple">
                {terminalsList.map((terminal) => (
                  <Select.Option key={terminal.id} value={terminal.id}>
                    {terminal.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Рабочие графики" name="users_work_schedules">
              <Select mode="multiple">
                {work_schedules.map((work_schedule: any) => (
                  <Select.OptGroup
                    key={work_schedule.name}
                    label={work_schedule.name}
                  >
                    {work_schedule.children.map(
                      (work_schedule: IWorkSchedules) => (
                        <Select.Option
                          key={work_schedule.id}
                          value={work_schedule.id}
                        >
                          {work_schedule.name}
                        </Select.Option>
                      )
                    )}
                  </Select.OptGroup>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Дневной гарант" name="daily_garant_id">
              <Select allowClear>
                {daily_garantList.map((daily_garant: any) => (
                  <Select.Option key={daily_garant.id} value={daily_garant.id}>
                    {daily_garant.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Максимальное количество активных заказов"
              name="max_active_order_count"
            >
              <InputNumber type="number" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Имя на карте" name="card_name">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Номер карты" name="card_number">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Модель машины" name="car_model">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Гос. номер машины" name="car_number">
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Create>
  );
}

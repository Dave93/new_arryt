import { useForm, Edit } from "@refinedev/antd";
import { Form, Input, Select, Row, Col, InputNumber } from "antd";
import { useGetIdentity, useTranslate } from "@refinedev/core";
import {
  IRoles,
  ITerminals,
  IUsers,
  IWorkSchedules,
} from "@admin/src/interfaces";
import { chain, sortBy } from "lodash";
import { useEffect, useState } from "react";
import { drive_type, user_status } from "@admin/src/interfaces/enums";
import FileUploaderMultiple from "@admin/src/components/file_uploader/multiple";
import { daily_garant, roles, terminals, users } from "@api/drizzle/schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { WorkScheduleWithRelations } from "@api/src/modules/work_schedules/dto/list.dto";
import { apiClient } from "@admin/src/eden";

export const UsersEdit: React.FC = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const tr = useTranslate();
  const { formProps, saveButtonProps, redirect, id } = useForm<
    InferInsertModel<typeof users>
  >({
    meta: {
      fields: [
        "id",
        "first_name",
        "last_name",
        "created_at",
        "drive_type",
        "car_model",
        "car_number",
        "card_name",
        "card_number",
        "phone",
        "latitude",
        "longitude",
        "status",
        "max_active_order_count",
        "doc_files",
        "terminals.id",
        "terminals.name",
      ],
      pluralize: true,
      updateInputName: "usersUncheckedUpdateInput",
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

  const setSelectValues = () => {
    setTimeout(() => {
      let formValues: any = formProps.form?.getFieldsValue();
      formProps.form?.setFieldsValue({
        ...formValues,
        roles:
          formValues.roles && formValues.roles.length > 0
            ? formValues.roles[0].roles.id
            : null,
        users_work_schedules:
          formValues.users_work_schedules &&
          formValues.users_work_schedules.length > 0
            ? formValues.users_work_schedules.map(
                (item: any) => item.work_schedules.id
              )
            : null,
        users_terminals:
          formValues.users_terminals && formValues.users_terminals.length > 0
            ? formValues.users_terminals.map((item: any) => item.terminals.id)
            : null,
      });
    }, 200);
  };

  const loadData = async () => {
    await fetchAllData();
    setSelectValues();
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Edit
      saveButtonProps={{
        disabled: saveButtonProps.disabled,
        loading: saveButtonProps.loading,
        onClick: async () => {
          // try {
          //   let values: any = await formProps.form?.validateFields();
          //   let users_terminals = values.users_terminals;
          //   let work_schedules = values.users_work_schedules;
          //   let roles = values.users_roles_usersTousers_roles_user_id;
          //   delete values.users_terminals;
          //   delete values.users_work_schedules;
          //   delete values.users_roles_usersTousers_roles_user_id;
          //   let createQuery = gql`
          //     mutation (
          //       $data: usersUncheckedUpdateInput!
          //       $where: usersWhereUniqueInput!
          //     ) {
          //       updateUser(data: $data, where: $where) {
          //         id
          //       }
          //     }
          //   `;
          //   let { updateUser } = await client.request<{
          //     updateUser: IUsers;
          //   }>(
          //     createQuery,
          //     {
          //       data: values,
          //       where: { id },
          //     },
          //     { Authorization: `Bearer ${identity?.token.accessToken}` }
          //   );
          //   if (updateUser) {
          //     let { query, variables } = gqlb.mutation([
          //       {
          //         operation: "linkUserToRoles",
          //         variables: {
          //           userId: {
          //             value: updateUser.id,
          //             required: true,
          //           },
          //           roleId: {
          //             value: roles,
          //             required: true,
          //           },
          //         },
          //         fields: ["user_id"],
          //       },
          //       {
          //         operation: "linkUserToWorkSchedules",
          //         variables: {
          //           userId: {
          //             value: updateUser.id,
          //             required: true,
          //           },
          //           workScheduleId: {
          //             value: work_schedules,
          //             type: "[String!]",
          //             required: true,
          //           },
          //         },
          //         fields: ["count"],
          //       },
          //       {
          //         operation: "linkUserToTerminals",
          //         variables: {
          //           userId: {
          //             value: updateUser.id,
          //             required: true,
          //           },
          //           terminalId: {
          //             value: users_terminals,
          //             type: "[String!]",
          //             required: true,
          //           },
          //         },
          //         fields: ["count"],
          //       },
          //     ]);
          //     await client.request(query, variables, {
          //       Authorization: `Bearer ${identity?.token.accessToken}`,
          //     });
          //     redirect("list");
          //   }
          // } catch (error) {}
        },
      }}
      title="Редактирование пользователя"
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
                {work_schedules.map((work_schedule) => (
                  <Select.OptGroup
                    key={work_schedule.name}
                    label={work_schedule.name}
                  >
                    {work_schedule.children.map((work_schedule) => (
                      <Select.Option
                        key={work_schedule.id}
                        value={work_schedule.id}
                      >
                        {work_schedule.name}
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
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
        <Form.Item
          label="Документы"
          name="doc_files"
          style={{
            height: 250,
          }}
        >
          {/* @ts-ignore */}
          <FileUploaderMultiple modelId={id} />
        </Form.Item>
      </Form>
    </Edit>
  );
};

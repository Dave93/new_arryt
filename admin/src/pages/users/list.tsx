import {
  List,
  DateField,
  useTable,
  useDrawerForm,
  Edit,
} from "@refinedev/antd";

import {
  Table,
  Space,
  Form,
  Select,
  DatePicker,
  Input,
  Button,
  Row,
  Col,
  InputNumber,
  Drawer,
} from "antd";

import {
  CrudFilters,
  HttpError,
  useGetIdentity,
  useNotification,
  useTranslate,
} from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { chain, sortBy } from "lodash";
import { EditOutlined, LinkOutlined } from "@ant-design/icons";
import { IUsers } from "@admin/src/interfaces";
import { defaultDateTimeFormat } from "@admin/src/localConstants";
import { useEffect, useState } from "react";
import { drive_type, user_status } from "@admin/src/interfaces/enums";
import FileUploaderMultiple from "@admin/src/components/file_uploader/multiple";
import DebounceSelect from "@admin/src/components/select/debounceSelector";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import dayjs from "dayjs";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import { apiClient } from "@admin/src/eden";
import { daily_garant, roles, terminals } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { WorkScheduleWithRelations } from "@api/src/modules/work_schedules/dto/list.dto";
import { UsersModel } from "@api/src/modules/user/dto/list.dto";

const OnlineStatus = ({ value }: { value: boolean }) => {
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: value ? "green" : "red",
      }}
    ></div>
  );
};

export const UsersList: React.FC = () => {
  const { open } = useNotification();
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();

  const queryClient = useQueryClient();
  const [terminalsList, setTerminals] = useState<
    InferSelectModel<typeof terminals>[]
  >([]);
  const [rolesList, setRoles] = useState<InferSelectModel<typeof roles>[]>([]);
  const [work_schedulesList, setWorkSchedules] = useState<
    {
      name: string;
      children: WorkScheduleWithRelations[];
    }[]
  >([]);
  const [daily_garantList, setDailyGarant] = useState<
    InferSelectModel<typeof daily_garant>[]
  >([]);
  const { tableProps, searchFormProps, filters, setFilters } = useTable<
    UsersModel,
    HttpError,
    {
      first_name?: string;
      last_name?: string;
      phone?: string;
      is_online?: boolean;
      terminal_id: string[];
      roles: string;
      status: string;
      id?: IUsers;
      drive_type: string[];
    }
  >({
    meta: {
      fields: [
        "id",
        "first_name",
        "last_name",
        "created_at",
        "is_online",
        "drive_type",
        "card_number",
        "phone",
        "latitude",
        "longitude",
        "status",
        "app_version",
        "work_schedules.name",
      ],
      whereInputType: "usersWhereInput!",
      orderByInputType: "usersOrderByWithRelationInput!",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },

    onSearch: async (values) => {
      const {
        first_name,
        last_name,
        phone,
        is_online,
        terminal_id,
        roles,
        status,
        id,
        drive_type,
      } = values;
      const filters: CrudFilters = [];
      queryClient.invalidateQueries(["default", "users", "list"]);
      if (phone) {
        filters.push({
          field: "phone",
          operator: "contains",
          value: phone,
        });
      }

      if (id) {
        filters.push({
          field: "id",
          operator: "eq",
          value: id.value,
        });
      }

      if (first_name) {
        filters.push({
          field: "first_name",
          operator: "contains",
          value: first_name,
        });
      }
      if (last_name) {
        filters.push({
          field: "last_name",
          operator: "contains",
          value: last_name,
        });
      }
      if (is_online !== undefined) {
        filters.push({
          field: "is_online",
          operator: "eq",
          value: is_online,
        });
      }

      if (terminal_id && terminal_id.length) {
        filters.push({
          field: "users_terminals.terminal_id",
          operator: "in",
          value: terminal_id,
        });
      }

      if (roles) {
        filters.push({
          field: "users_roles_usersTousers_roles_user_id",
          operator: "contains",
          value: {
            custom: {
              some: {
                role_id: {
                  equals: roles,
                },
              },
            },
          },
        });
      }

      if (status) {
        filters.push({
          field: "status",
          operator: "eq",
          value: status,
        });
      }

      if (drive_type && drive_type.length) {
        filters.push({
          field: "drive_type",
          operator: "in",
          value: drive_type,
        });
      }

      return filters;
    },

    pagination: {
      pageSize: 200,
    },

    filters: {
      defaultBehavior: "replace",
    },

    sorters: {
      initial: [
        {
          field: "first_name",
          order: "asc",
        },
      ],
    },
  });

  const {
    drawerProps,
    formProps,
    show,
    close,
    saveButtonProps,
    deleteButtonProps,
    id,
  } = useDrawerForm<UsersModel>({
    action: "edit",
    resource: "users",
    redirect: false,
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
        "order_start_date",
        "daily_garant_id",
        "work_schedules.id",
        "work_schedules.name",
        "terminals.id",
        "roles.id",
      ],
      pluralize: true,
      updateInputName: "usersUncheckedUpdateInput",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const getAllFilterData = async () => {
    const { data: terminals } = await apiClient.api.terminals.cached.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    if (terminals && Array.isArray(terminals)) {
      setTerminals(sortBy(terminals, (item) => item.name));
    }

    const { data: workSchedules } =
      await apiClient.api.work_schedules.cached.get({
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });
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

    const { data: cachedDailyGarant } =
      await apiClient.api.daily_garant.cached.get({
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });

    if (cachedDailyGarant && Array.isArray(cachedDailyGarant)) {
      setDailyGarant(cachedDailyGarant);
    }

    const { data: roles } = await apiClient.api.roles.cached.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });

    if (roles && Array.isArray(roles)) {
      setRoles(roles);
    }
  };
  const fetchCourier = async (queryText: string) => {
    const { data: users } = await apiClient.api.couriers.search.get({
      $query: {
        search: queryText,
      },
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    if (users && Array.isArray(users)) {
      return (
        users?.map((user) => ({
          key: user.id,
          value: user.id,
          label: `${user.first_name} ${user.last_name} (${user.phone})`,
        })) ?? []
      );
    } else {
      return [];
    }
  };

  const tr = useTranslate();

  useEffect(() => {
    getAllFilterData();
  }, []);

  return (
    <>
      <List title="Список пользователей">
        <Form layout="horizontal" {...searchFormProps}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="id" label="ФИО">
                <DebounceSelect fetchOptions={fetchCourier} allowClear />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="phone" label="Телефон">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Роль" name="roles">
                <Select>
                  {rolesList.map((role) => (
                    <Select.Option key={role.id} value={role.id}>
                      {role.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" label="Статус">
                <Select
                  allowClear
                  options={[
                    {
                      label: tr("users.status.active"),
                      value: "active",
                    },
                    {
                      label: tr("users.status.inactive"),
                      value: "inactive",
                    },
                    {
                      label: tr("users.status.blocked"),
                      value: "blocked",
                    },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="drive_type" label="Тип доставки">
                <Select allowClear mode="multiple">
                  {Object.keys(drive_type).map((type: string) => (
                    <Select.Option key={type} value={type}>
                      {tr(`deliveryPricing.driveType.${type}`)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="terminal_id" label="Филиал">
                <Select
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  mode="multiple"
                >
                  {terminalsList.map((terminal: any) => (
                    <Select.Option key={terminal.id} value={terminal.id}>
                      {terminal.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="is_online" label="Онлайн">
                <Select
                  options={[
                    { label: "Все", value: undefined },
                    { label: "Да", value: true },
                    { label: "Нет", value: false },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item>
                <Button htmlType="submit" type="primary">
                  Фильтровать
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Table {...tableProps} rowKey="id">
          <Table.Column
            dataIndex="index"
            title="№"
            width={60}
            render={(value: any, record: any, index: number) => (
              <div>{index + 1}</div>
            )}
          />
          <Table.Column
            dataIndex="status"
            title="Статус"
            render={(value) => tr(`users.status.${value}`)}
          />
          <Table.Column
            dataIndex="is_online"
            title="Онлайн"
            render={(value) => <OnlineStatus value={value} />}
          />
          <Table.Column
            dataIndex="phone"
            title="Телефон"
            width={200}
            render={(value: string) => formatPhoneNumberIntl(value)}
          />
          <Table.Column dataIndex="first_name" title="Имя" />
          <Table.Column dataIndex="last_name" title="Фамилия" />
          {/* <Table.Column dataIndex="roles" title="Роль" render={(value, record: IUsers) => } /> */}
          <Table.Column
            dataIndex="drive_type"
            title="Тип доставки"
            render={(value) => tr("deliveryPricing.driveType." + value)}
          />
          {/* <Table.Column dataIndex="card_number" title="Номер карты" /> */}
          <Table.Column
            dataIndex="work_schedules"
            title="График работы"
            render={(val) => (
              <div>{val?.map((item: any) => item.name).join(", ")}</div>
            )}
          />
          {/* <Table.Column dataIndex="latitude" title="Широта" />
          <Table.Column dataIndex="longitude" title="Долгота" /> */}
          <Table.Column dataIndex="app_version" title="Версия приложения" />
          <Table.Column
            dataIndex="created_at"
            title="Дата создания"
            render={(value) => (
              <DateField
                format={defaultDateTimeFormat}
                value={value}
                locales="ru"
              />
            )}
          />
          <Table.Column<IUsers>
            title="Действия"
            dataIndex="actions"
            render={(_text, record): React.ReactNode => {
              return (
                <Space>
                  <Button
                    size="small"
                    icon={<LinkOutlined />}
                    onClick={() => navigator.clipboard.writeText(record.id)}
                  />
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => show(record.id)}
                  />
                  <Button
                    icon={<ArrowTopRightOnSquareIcon />}
                    size="small"
                    onClick={() => window.open(`/users/show/${record.id}`)}
                  />
                </Space>
              );
            }}
          />
        </Table>
        <Drawer {...drawerProps} width={800}>
          <Edit
            canDelete={false}
            saveButtonProps={{
              disabled: saveButtonProps.disabled,
              loading: saveButtonProps.loading,
              onClick: async () => {
                try {
                  let values: any = await formProps.form?.validateFields();
                  let usersTerminals = values.terminals;
                  let usersWorkSchedules = values.work_schedules;
                  let roles = values.roles;
                  delete values.terminals;
                  delete values.roles;
                  delete values.work_schedules;

                  if (usersTerminals && Array.isArray(usersTerminals)) {
                    usersTerminals = usersTerminals.map((item: any) =>
                      typeof item == "string" ? item : item.id
                    );
                  }

                  if (usersWorkSchedules && Array.isArray(usersWorkSchedules)) {
                    usersWorkSchedules = usersWorkSchedules.map((item: any) =>
                      typeof item == "string" ? item : item.id
                    );
                  }

                  if (roles && "id" in roles) {
                    roles = roles.id;
                  }

                  try {
                    const { data, status, error } = await apiClient.api.users[
                      id!
                    ].put({
                      data: {
                        ...values,
                        usersTerminals,
                        usersWorkSchedules,
                        roles,
                      },
                      fields: "id",
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
                            : error?.message ??
                              "Ошибка при создании пользователя",
                      });
                    }
                    close();
                  } catch (e: any) {
                    return open!({
                      type: "error",
                      message: e.message,
                    });
                  }
                } catch (error) {}
              },
            }}
            deleteButtonProps={deleteButtonProps}
            recordItemId={id}
            title="Редактирование разрешения"
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
                    getValueProps={(value) => {
                      return {
                        value: value
                          ? Array.isArray(value)
                            ? value?.map((item: any) => item.roles.id)
                            : value.id
                          : "",
                      };
                    }}
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
                  <Form.Item
                    label="Филиалы"
                    name="terminals"
                    getValueProps={(value) => {
                      return {
                        value: value?.map((item: any) =>
                          typeof item == "string" ? item : item.id
                        ),
                      };
                    }}
                  >
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
                  <Form.Item
                    label="Рабочие графики"
                    name="work_schedules"
                    getValueProps={(value) => {
                      return {
                        value: value?.map((item: any) => {
                          return typeof item == "string"
                            ? item
                            : item && item.work_schedules
                            ? item.work_schedules.id
                            : item.id;
                        }),
                      };
                    }}
                  >
                    <Select mode="multiple">
                      {work_schedulesList.map((work_schedule) => (
                        <Select.OptGroup
                          key={`work_schedule.${work_schedule.name}`}
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
                  <Form.Item label="Дневной гарант" name="daily_garant_id">
                    <Select allowClear>
                      {daily_garantList.map((daily_garant) => (
                        <Select.Option
                          key={daily_garant.id}
                          value={daily_garant.id}
                        >
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
                <Col span={12}>
                  <Form.Item
                    label="Дата начала заказов для гаранта"
                    name="order_start_date"
                    getValueProps={(value) => ({
                      value: value ? dayjs(value) : "",
                    })}
                  >
                    <DatePicker allowClear format="DD.MM.YYYY" />
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
        </Drawer>
      </List>
    </>
  );
};

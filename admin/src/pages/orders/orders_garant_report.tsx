import { Edit, PageHeader, useDrawerForm } from "@refinedev/antd";

import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
} from "antd";

import { useGetIdentity, useTranslate } from "@refinedev/core";
import { DateTime } from "luxon";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import { GarantReportItem, IUsers } from "@admin/src/interfaces";
import { ExportOutlined } from "@ant-design/icons";
import { chain, sumBy } from "lodash";
import { drive_type, user_status } from "@admin/src/interfaces/enums";
import { ArrowDownIcon } from "@heroicons/react/24/solid";
import { useDownloadExcel } from "react-export-table-to-excel";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { apiClient } from "@admin/src/eden";
import { users, terminals } from "@api/drizzle/schema";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

dayjs.extend(utc);
dayjs.extend(timezone);

const OrdersGarantReport = () => {
  const tableRef = useRef(null);
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [garantData, setGarantData] = useState<GarantReportItem[]>([]);
  const [filteredData, setFilteredData] = useState<GarantReportItem[]>([]);
  const [couriersList, setCouriersList] = useState<
    (typeof users.$inferSelect)[]
  >([]);
  const [terminalsList, setTerminals] = useState<
    (typeof terminals.$inferSelect)[]
  >([]);
  const [orderField, setOrderField] = useState<string | undefined>();
  const [direction, setDirection] = useState<"asc" | "desc" | undefined>();
  const { handleSubmit, control, watch } = useForm();

  const tr = useTranslate();

  const month = watch("month");
  const status = watch("status");
  const driveType = watch("drive_type");
  const courier_id = watch("courier_id");
  const walletPeriod = watch("wallet_period");
  const terminal_id = watch("terminal_id");

  const onSubmit = async (data: any) => {
    loadData();
  };

  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: "Garant",
    sheet: "Garant",
  });

  const loadData = async () => {
    setIsLoading(true);
    // start of month using luxon
    let startDate = DateTime.local().startOf("month").toISO();
    // end of month using luxon
    let endDate = DateTime.local().endOf("month").toISO();
    if (month) {
      // start of month using dayjs and to iso date
      startDate = month.tz("Asia/Tashkent").startOf("month").toISOString();
      // end of month using dayjs and to iso date
      endDate = month.tz("Asia/Tashkent").endOf("month").toISOString();
    }

    let { data } = await apiClient.api.orders.calculate_garant.post({
      data: {
        startDate: startDate!,
        endDate: endDate!,
        // courier_id: courier_id,
        walletEndDate: walletPeriod,
        // terminal_id: terminal_id,
      },
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });

    if (data && Array.isArray(data)) {
      setGarantData(data);
      if (status) {
        data = data.filter((item) => item.status === status);
      }
      if (driveType) {
        // @ts-ignore
        data = data.filter((item) => driveType.includes(item.drive_type));
      }

      setFilteredData(data);
    }
    setIsLoading(false);
  };

  const {
    drawerProps,
    formProps,
    show,
    close,
    saveButtonProps,
    deleteButtonProps,
    id,
  } = useDrawerForm<typeof users.$inferSelect>({
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
        {
          users_terminals: [
            {
              terminals: ["id", "name"],
            },
          ],
        },
        {
          users_work_schedules: [
            {
              work_schedules: ["id", "name"],
            },
          ],
        },
        {
          users_roles_usersTousers_roles_user_id: [
            {
              roles: ["id", "name"],
            },
          ],
        },
      ],
      pluralize: true,
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const exportData = async () => {
    setIsLoading(true);
    // const excel = new Excel();
    // excel
    //   .addSheet("test")
    //   .addColumns(columns.filter((c) => c.exportable !== false))
    //   .addDataSource(filteredData, {
    //     str2Percent: true,
    //   })
    //   .saveAs("Гарант.xlsx");

    setIsLoading(false);
  };

  const fetchAllData = async () => {
    // const query = gql`
    //   query {
    //     cachedTerminals {
    //       id
    //       name
    //       organization {
    //         id
    //         name
    //       }
    //     }
    //     users(
    //       where: {
    //         users_roles_usersTousers_roles_user_id: {
    //           some: { roles: { is: { code: { equals: "courier" } } } }
    //         }
    //         status: { equals: active }
    //       }
    //     ) {
    //       first_name
    //       last_name
    //       id
    //     }
    //   }
    // `;
    // const { cachedTerminals, users } = await client.request<{
    //   cachedTerminals: ITerminals[];
    //   users: IUsers[];
    // }>(query, {}, { Authorization: `Bearer ${identity?.token.accessToken}` });
    // var result = chain(cachedTerminals)
    //   .groupBy("organization.name")
    //   .toPairs()
    //   .map(function (item) {
    //     return {
    //       name: item[0],
    //       children: item[1],
    //     };
    //   })
    //   .value();
    // setCouriersList(users);
    // setTerminals(sortBy(cachedTerminals, ["name"]));
  };

  const setTableOrdering = (field: string) => {
    if (field === orderField) {
      if (direction === "asc") {
        setDirection("desc");
      } else {
        setDirection(undefined);
        setOrderField(undefined);
      }
    } else {
      setOrderField(field);
      setDirection("asc");
    }
  };

  const resultData = useMemo(() => {
    let data = [...filteredData];
    let result = [];
    if (orderField !== undefined && direction !== undefined) {
      if (direction === "asc") {
        data = data.sort((a: any, b: any) => {
          if (+a[orderField] < +b[orderField]) {
            return -1;
          }
          if (+a[orderField] > +b[orderField]) {
            return 1;
          }
          return 0;
        });
      } else {
        data = data.sort((a: any, b: any) => {
          if (+a[orderField] < +b[orderField]) {
            return 1;
          }
          if (+a[orderField] > +b[orderField]) {
            return -1;
          }
          return 0;
        });
      }
      result = data;
    } else {
      result = chain(data)
        .groupBy("terminal_name")
        .toPairs()
        .map(function (item) {
          return {
            name: item[0],
            children: item[1],
          };
        })
        .value();
      result = result.map((item: any) => {
        item.total_balance_to_pay = sumBy(item.children, "balance_to_pay");
        return item;
      });
    }
    return result;
  }, [filteredData, orderField, direction]);

  const [totalColspan, organizations] = useMemo(() => {
    const organizations: any = {};
    filteredData.forEach((item) => {
      item.delivery_price_orgs &&
        item.delivery_price_orgs.forEach((org) => {
          if (!organizations[org.id]) {
            organizations[org.id] = {
              id: org.id,
              name: org.name,
              terminal_count: 0,
            };
          }

          if (
            (org.children.length + 1) * 2 >
              organizations[org.id].terminal_count &&
            org.children.length < 5
          ) {
            organizations[org.id].terminal_count =
              (org.children.length + 1) * 2;
          }
        });
    });
    let totalColspan = 0;
    Object.keys(organizations).forEach((key) => {
      totalColspan += organizations[key].terminal_count;
    });
    return [totalColspan, Object.values(organizations)];
  }, [filteredData]);

  useEffect(() => {
    fetchAllData();
    loadData();

    return () => {};
  }, [identity]);

  return (
    <div>
      <PageHeader
        title="Гарант"
        ghost={false}
        extra={
          <Space>
            <Button
              type="default"
              icon={<ExportOutlined />}
              onClick={onDownload}
            >
              Экспорт
            </Button>
          </Space>
        }
      >
        <Spin spinning={isLoading}>
          <Form onFinish={handleSubmit(onSubmit)}>
            <Card
              bordered={false}
              actions={[
                <Space key="save-btn">
                  <Button type="primary" htmlType="submit">
                    Фильтровать
                  </Button>
                </Space>,
              ]}
            >
              <Row gutter={16}>
                <Col span={4}>
                  <Form.Item label="Месяц">
                    <Controller
                      name="month"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          {...field}
                          picker="month"
                          format="MMM YYYY"
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Филиал">
                    <Controller
                      name="terminal_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          showSearch
                          optionFilterProp="children"
                          allowClear
                          mode="multiple"
                        >
                          {terminalsList.map((terminal: any) => (
                            <Select.Option
                              key={terminal.id}
                              value={terminal.id}
                            >
                              {terminal.name}
                            </Select.Option>
                          ))}
                        </Select>
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Курьер">
                    <Controller
                      name="courier_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Выберите курьера"
                          allowClear
                          showSearch
                          optionFilterProp="children"
                          filterOption={(input, option) =>
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          filterSort={(optionA, optionB) =>
                            (optionA?.label ?? "")
                              .toLowerCase()
                              .localeCompare(
                                (optionB?.label ?? "").toLowerCase()
                              )
                          }
                          mode="multiple"
                          options={couriersList.map((c) => ({
                            label: `${c.first_name} ${c.last_name}`,
                            value: c.id,
                          }))}
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Статус">
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Выберите статус"
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
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Тип доставки">
                    <Controller
                      name="drive_type"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Выберите тип доставки"
                          allowClear
                          mode="multiple"
                        >
                          {Object.keys(drive_type).map((type: string) => (
                            <Select.Option key={type} value={type}>
                              {tr(`deliveryPricing.driveType.${type}`)}
                            </Select.Option>
                          ))}
                        </Select>
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Период кошелька">
                    <Controller
                      name="wallet_period"
                      control={control}
                      render={({ field }) => (
                        <DatePicker {...field} format="DD.MM.YYYY" />
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Form>
          <Card bordered={false}>
            <table
              className="w-full text-left border garant-table"
              ref={tableRef}
            >
              <thead className="  uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-2 py-3 bg-gray-50">
                    №
                  </th>
                  <th scope="col" className="px-2 py-3 bg-gray-50">
                    Курьер
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setTableOrdering("delivery_price");
                    }}
                  >
                    <div className="flex items-center">
                      <div>Сумма всех доставок</div>
                      {orderField == "delivery_price" &&
                        direction !== undefined && (
                          <div className="flex justify-center">
                            <div
                              className={`${
                                direction === "asc" ? "rotate-180" : ""
                              }`}
                            >
                              <ArrowDownIcon className="w-4" />
                            </div>
                          </div>
                        )}
                    </div>
                  </th>
                  <th scope="col" className="px-2 py-3 bg-gray-50">
                    Бонус
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setTableOrdering("balance_to_pay");
                    }}
                  >
                    <div className="flex items-center">
                      <div>Остаток для выплаты</div>
                      {orderField == "balance_to_pay" &&
                        direction !== undefined && (
                          <div className="flex justify-center">
                            <div
                              className={`${
                                direction === "asc" ? "rotate-180" : ""
                              }`}
                            >
                              <ArrowDownIcon className="w-4" />
                            </div>
                          </div>
                        )}
                    </div>
                  </th>
                  <th scope="col" className="px-2 py-3 bg-gray-50">
                    Кол-во заказов
                  </th>
                  <th scope="col" className="px-2 py-3 bg-gray-50">
                    Дата начала
                  </th>
                  <th scope="col" className="px-2 py-3 bg-gray-50">
                    Дата последнего заказа
                  </th>
                  <th scope="col" className="px-2 py-3 bg-gray-50">
                    Дата создания
                  </th>
                  <th scope="col" className="px-2 py-3 bg-gray-50">
                    Кол-во отработанных дней
                  </th>
                  {organizations.length > 0 &&
                    organizations.map((org: any) => (
                      <th
                        scope="col"
                        className="px-2 py-3 bg-gray-50"
                        key={org.id}
                        colSpan={org.terminal_count}
                      >
                        {org.name}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {direction !== undefined && orderField !== undefined
                  ? resultData.map((child: any, index: number) => (
                      <tr
                        key={child.courier_id}
                        className="bg-white border-b hover:bg-gray-50"
                      >
                        <td className="px-2 py-2">{index + 1}</td>
                        <td className="px-2 py-2">{child.courier}</td>
                        <td className="px-2 py-2">
                          {new Intl.NumberFormat("ru-RU").format(
                            child.delivery_price
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {new Intl.NumberFormat("ru-RU").format(
                            child.bonus_total
                          )}
                        </td>
                        <td align="right" className="px-2 py-2">
                          {new Intl.NumberFormat("ru-RU").format(
                            +child.balance_to_pay
                          )}
                        </td>
                        <td align="right" className="px-2 py-2">
                          {child.orders_count}
                        </td>
                        <td className="px-2 py-2">
                          {dayjs(child.begin_date).format("DD.MM.YYYY")}
                        </td>
                        <td className="px-2 py-2">
                          {dayjs(child.last_order_date).format("DD.MM.YYYY")}
                        </td>
                        <td className="px-2 py-2">
                          {dayjs(child.created_at).format("DD.MM.YYYY")}
                        </td>
                        <td className="px-2 py-2">{child.order_dates_count}</td>
                        {organizations.length > 0 &&
                          child.delivery_price_orgs &&
                          child.delivery_price_orgs.length > 0 &&
                          child.delivery_price_orgs.map((org: any) => (
                            <Fragment key={`${child.courier_id}_${org.id}`}>
                              {org.children.length < 5 &&
                                org.children.map((children: any) => (
                                  <Fragment
                                    key={`${child.courier_id}_${children.terminal_id}`}
                                  >
                                    <td align="right" className="px-2 py-2">
                                      {children.terminal_name}
                                    </td>
                                    <td align="right" className="px-2 py-2">
                                      {new Intl.NumberFormat("ru-RU").format(
                                        +children.delivery_price
                                      )}
                                    </td>
                                  </Fragment>
                                ))}
                              {5 - org.children.length > 0 &&
                                Array(5 - org.children.length)
                                  .fill(0)
                                  .map((item: any, index: number) => (
                                    <td
                                      align="right"
                                      className="px-2 py-2"
                                      key={`${child.courier_id}_${index}`}
                                    ></td>
                                  ))}
                            </Fragment>
                          ))}
                      </tr>
                    ))
                  : resultData.map((item: any, index: number) => (
                      <Fragment key={item.name}>
                        <tr className="bg-white border-b  hover:bg-gray-50">
                          <th
                            colSpan={9 + totalColspan}
                            align="left"
                            className="px-2 py-2"
                          >
                            {item.name}
                          </th>
                        </tr>
                        {item.children.map((child: any, index: number) => (
                          <tr
                            key={child.courier_id}
                            className="bg-white border-b hover:bg-gray-50"
                          >
                            <td className="px-2 py-2">{index + 1}</td>
                            <td className="px-2 py-2">{child.courier}</td>
                            <td className="px-2 py-2">
                              {new Intl.NumberFormat("ru-RU").format(
                                child.delivery_price
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {new Intl.NumberFormat("ru-RU").format(
                                child.bonus_total
                              )}
                            </td>
                            <td align="right" className="px-2 py-2">
                              {new Intl.NumberFormat("ru-RU").format(
                                +child.balance_to_pay
                              )}
                            </td>
                            <td align="right" className="px-2 py-2">
                              {child.orders_count}
                            </td>
                            <td className="px-2 py-2">
                              {dayjs(child.begin_date).format("DD.MM.YYYY")}
                            </td>
                            <td className="px-2 py-2">
                              {dayjs(child.last_order_date).format(
                                "DD.MM.YYYY"
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {dayjs(child.created_at).format("DD.MM.YYYY")}
                            </td>
                            <td className="px-2 py-2">
                              {child.order_dates_count}
                            </td>
                            {organizations.length > 0 &&
                              child.delivery_price_orgs &&
                              child.delivery_price_orgs.length > 0 &&
                              child.delivery_price_orgs.map((org: any) => (
                                <Fragment key={`${child.courier_id}_${org.id}`}>
                                  {org.children.length < 5 &&
                                    org.children.map((children: any) => (
                                      <Fragment
                                        key={`${child.courier_id}_${children.terminal_id}`}
                                      >
                                        <td align="right" className="px-2 py-2">
                                          {children.terminal_name}
                                        </td>
                                        <td align="right" className="px-2 py-2">
                                          {new Intl.NumberFormat(
                                            "ru-RU"
                                          ).format(+children.delivery_price)}
                                        </td>
                                      </Fragment>
                                    ))}
                                  {5 - org.children.length > 0 &&
                                    Array(5 - org.children.length)
                                      .fill(0)
                                      .map((item: any, index: number) => (
                                        <td
                                          align="right"
                                          className="px-2 py-2"
                                          key={`${child.courier_id}_${index}`}
                                        ></td>
                                      ))}
                                </Fragment>
                              ))}
                          </tr>
                        ))}
                        <tr className="bg-white border-b hover:bg-gray-50">
                          <th colSpan={2} align="right" className="px-2 py-2">
                            Итого
                          </th>

                          <th colSpan={3} align="right" className="px-2 py-2">
                            {new Intl.NumberFormat("ru-RU").format(
                              item.total_balance_to_pay
                            )}
                          </th>
                        </tr>
                        <tr></tr>
                      </Fragment>
                    ))}
              </tbody>
            </table>
          </Card>
        </Spin>
      </PageHeader>
      <Drawer {...drawerProps} width={600}>
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
              //     close();
              //     loadData();
              //   }
              // } catch (error) {}
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
          </Form>
        </Edit>
      </Drawer>
    </div>
  );
};

export default OrdersGarantReport;

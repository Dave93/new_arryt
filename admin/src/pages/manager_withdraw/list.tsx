import { List, useTable, ExportButton } from "@refinedev/antd";
import { Table, Button, Form, Select, Col, Row, DatePicker } from "antd";

import {
  CrudFilters,
  HttpError,
  useGetIdentity,
  useInvalidate,
} from "@refinedev/core";

import { useQueryClient } from "@tanstack/react-query";

import { IManagerWithdraw, ITerminals, IUsers } from "@admin/src/interfaces";
import { sortBy } from "lodash";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import duration from "dayjs/plugin/duration";
import DebounceSelect from "@admin/src/components/select/debounceSelector";
import { useTableExport } from "@admin/src/components/export/table";
import { rangePresets } from "@admin/src/components/dates/RangePresets";
import { ManagerWithdrawTransactions } from "@admin/src/components/users/courier_withdraws";
import { apiClient } from "@admin/src/eden";
import { organization } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { ManagerWithdrawWithRelations } from "@api/src/modules/manager_withdraw/dto/list.dto";
import WeekDay from "dayjs/plugin/weekday";
dayjs.locale("ru");
dayjs.extend(WeekDay);
dayjs.extend(duration);

const { RangePicker } = DatePicker;

export const ManagerWithdrawList: React.FC = () => {
  const invalidate = useInvalidate();
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [organizations, setOrganizations] = useState<
    InferSelectModel<typeof organization>[]
  >([]);
  const [terminals, setTerminals] = useState<any[]>([]);

  const {
    tableProps,
    searchFormProps,
    filters,
    sorters: sorter,
  } = useTable<
    ManagerWithdrawWithRelations,
    HttpError,
    {
      organization_id: string;
      created_at: [dayjs.Dayjs, dayjs.Dayjs];
      terminal_id: string[];
      courier_id: any;
      orders_couriers: string;
    }
  >({
    // queryOptions: {
    //   queryKey: ["manager_withdraw"],
    // },

    meta: {
      fields: [
        "id",
        "amount",
        "amount_before",
        "amount_after",
        "created_at",
        "payed_date",
        "managers.first_name",
        "managers.last_name",
        "terminals.name",
        "couriers.first_name",
        "couriers.last_name",
      ],
      whereInputType: "manager_withdrawWhereInput!",
      orderByInputType: "manager_withdrawOrderByWithRelationInput!",
      operation: "managerWithdraws",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },

    onSearch: async (params) => {
      const localFilters: CrudFilters = [];
      // queryClient.invalidateQueries();
      const {
        organization_id,
        created_at,
        terminal_id,
        courier_id,
        orders_couriers,
      } = params;

      localFilters.push(
        {
          field: "created_at",
          operator: "gte",
          value: created_at ? created_at[0].toISOString() : undefined,
        },
        {
          field: "created_at",
          operator: "lte",
          value: created_at ? created_at[1].toISOString() : undefined,
        }
      );

      if (organization_id) {
        localFilters.push({
          field: "organization_id",
          operator: "eq",
          value: organization_id,
        });
      }

      if (terminal_id && terminal_id.length) {
        localFilters.push({
          field: "terminal_id",
          operator: "in",
          value: terminal_id,
        });
      }

      if (courier_id && courier_id.value) {
        localFilters.push({
          field: "courier_id",
          operator: "eq",
          value: courier_id.value,
        });
      }

      if (orders_couriers) {
        localFilters.push({
          field: "orders_couriers",
          operator: "contains",
          value: {
            custom: {
              is: {
                status: {
                  equals: orders_couriers,
                },
              },
            },
          },
        });
      }
      // invalidate({
      //   resource: "manager_withdraw",
      //   invalidates: ["list"],
      // });
      return localFilters;
    },

    pagination: {
      pageSize: 1000,
    },

    filters: {
      initial: [
        {
          field: "created_at",
          operator: "gte",
          value: dayjs().startOf("d").toDate(),
        },
        {
          field: "created_at",
          operator: "lte",
          value: dayjs().endOf("d").toDate(),
        },
      ],

      defaultBehavior: "replace",
    },

    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc",
        },
      ],
    },
  });

  const columns = [
    {
      title: "Дата",
      dataIndex: "created_at",
      key: "created_at",
      exportable: true,
      render: (value: string) => dayjs(value).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Филиал",
      dataIndex: "terminals",
      key: "terminals",
      exportable: true,
      render: (value: ITerminals) => value.name,
    },
    {
      title: "Курьер",
      dataIndex: "couriers",
      key: "couriers",
      exportable: true,
      render: (value: IUsers) => `${value.first_name} ${value.last_name}`,
    },
    {
      title: "Менеджер",
      dataIndex: "managers",
      key: "managers",
      exportable: true,
      render: (value: IUsers) => `${value.first_name} ${value.last_name}`,
    },
    {
      title: "Выплатил",
      dataIndex: "amount",
      key: "amount",
      exportable: true,
      excelRender: (value: number) => +value,
      render: (value: string) => new Intl.NumberFormat("ru-RU").format(+value),
    },
    {
      title: "Кошелёк до выплат",
      dataIndex: "amount_before",
      key: "amount_before",
      exportable: true,
      excelRender: (value: number) => +value,
      render: (value: string) => new Intl.NumberFormat("ru-RU").format(+value),
    },
    {
      title: "Кошелёк после выплат",
      dataIndex: "amount_after",
      key: "amount_after",
      exportable: true,
      excelRender: (value: number) => +value,
      render: (value: string) => new Intl.NumberFormat("ru-RU").format(+value),
    },
  ];

  const { triggerExport, isLoading } = useTableExport<IManagerWithdraw>({
    metaData: {
      fields: [
        "id",
        "amount",
        "amount_before",
        "amount_after",
        "created_at",
        "payed_date",
        "managers.first_name",
        "managers.last_name",
        "terminals.name",
        "couriers.first_name",
        "couriers.last_name",
      ],
      whereInputType: "manager_withdrawWhereInput!",
      orderByInputType: "manager_withdrawOrderByWithRelationInput!",
      operation: "managerWithdraws",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
    filters,
    sorter,
    columns,
    pageSize: 1000,
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
    const { data: organizations } =
      await apiClient.api.organizations.cached.get({
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });
    if (organizations && Array.isArray(organizations)) {
      setOrganizations(organizations);
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

  useEffect(() => {
    getAllFilterData();
  }, []);

  return (
    <>
      <List
        title="Выплаты курьерам"
        headerProps={{
          extra: (
            <div>
              <ExportButton onClick={triggerExport} loading={isLoading} />
            </div>
          ),
        }}
      >
        <Form
          layout="vertical"
          {...searchFormProps}
          initialValues={{
            created_at: [dayjs().startOf("d"), dayjs().endOf("d")],
          }}
        >
          <Row gutter={16} align="bottom">
            <Col xs={12} sm={12} md={5}>
              <Form.Item label="Дата" name="created_at">
                <RangePicker
                  format={"DD.MM.YYYY HH:mm"}
                  showTime
                  presets={rangePresets}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={12} md={3}>
              <Form.Item name="courier_id" label="Курьер">
                <DebounceSelect fetchOptions={fetchCourier} allowClear />
              </Form.Item>
            </Col>
            <Col xs={12} sm={12} md={3}>
              <Form.Item name="organization_id" label="Организация">
                <Select
                  allowClear
                  options={organizations.map((org) => ({
                    label: org.name,
                    value: org.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={12} md={3}>
              <Form.Item name="terminal_id" label="Филиал">
                <Select
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  mode="multiple"
                >
                  {terminals.map((terminal: any) => (
                    <Select.Option key={terminal.id} value={terminal.id}>
                      {terminal.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={2}>
              <Form.Item>
                <Button htmlType="submit" type="primary">
                  Фильтровать
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <div
          style={{
            overflow: "auto",
          }}
        >
          <Table
            {...tableProps}
            rowKey="id"
            bordered
            size="small"
            columns={columns}
            expandable={{
              expandedRowRender: (record: ManagerWithdrawWithRelations) => (
                <ManagerWithdrawTransactions record={record} />
              ),
            }}
            pagination={{
              ...tableProps.pagination,
              showSizeChanger: true,
            }}
            summary={(pageData) => {
              let total = 0;
              let amountBefore = 0;
              let amountAfter = 0;
              pageData.forEach(({ amount, amount_before, amount_after }) => {
                total += +amount;
                amountBefore += +amount_before;
                amountAfter += +amount_after;
              });
              return (
                <>
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5}>
                        Итого
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        {new Intl.NumberFormat("ru-RU").format(total)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        {new Intl.NumberFormat("ru-RU").format(amountBefore)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}>
                        {new Intl.NumberFormat("ru-RU").format(amountAfter)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                </>
              );
            }}
          />
        </div>
      </List>
    </>
  );
};

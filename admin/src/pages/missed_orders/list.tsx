import { List, useTable } from "@refinedev/antd";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Input,
} from "antd";
import { CrudFilters, HttpError, useGetIdentity } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { IMissedOrderEntity, IOrders } from "@admin/src/interfaces";
import { rangePresets } from "@admin/src/components/dates/RangePresets";
import { useEffect, useState } from "react";
import { sortBy } from "lodash";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import { SendOrderToYandex } from "@admin/src/components/orders/sendToYandex";
import { TrySendMultiYandex } from "@admin/src/components/orders/trySendMultiYandex";
import { apiClient } from "@admin/src/eden";
import { InferSelectModel } from "drizzle-orm";
import { terminals } from "@api/drizzle/schema";
import { MissedOrders } from "@api/src/modules/missed_orders/dto/list.dto";

const { RangePicker } = DatePicker;

const MissedOrdersList: React.FC = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [terminalsList, setTerminals] = useState<
    InferSelectModel<typeof terminals>[]
  >([]);

  const queryClient = useQueryClient();

  const { tableProps, searchFormProps } = useTable<
    MissedOrders,
    HttpError,
    {
      created_at: [dayjs.Dayjs, dayjs.Dayjs];
      status: string;
      role: string;
      terminal_id: string;
      need_action: boolean;
      order_number: number;
      region: string;
    }
  >({
    queryOptions: {
      // queryKey: ["missed_orders"],
      refetchInterval: 1000 * 5,
    },
    meta: {
      fields: [
        "id",
        "created_at",
        "order_status.id",
        "order_status.name",
        "order_status.color",
        "courier_id",
        "order_number",
        "pre_distance",
        "order_price",
        "payment_type",
        "terminals.name",
      ],
      whereInputType: "missedOrdersWhereInput!",
      orderByInputType: "missedOrdersOrderByWithRelationInput!",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },

    onSearch: async (params) => {
      const localFilters: CrudFilters = [];
      queryClient.invalidateQueries(["default", "missed_orders", "list"]);


      // queryClient.invalidateQueries();
      const { created_at, terminal_id, need_action, order_number,
        region } = params;

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

      if (terminal_id && terminal_id.length) {
        localFilters.push({
          field: "terminal_id",
          operator: "in",
          value: terminal_id,
        });
      }
      if (order_number) {
        localFilters.push({
          field: "order_number",
          operator: "eq",
          value: order_number,
        });
      }

      if (need_action) {
        localFilters.push({
          field: "order_status_id",
          operator: "eq",
          value: { equals: "new" },
        });
      }


      if (region) {
        localFilters.push({
          field: "terminals.region",
          operator: "eq",
          value: region,
        });
      }

      return localFilters;
    },

    pagination: {
      pageSize: 50,
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
        {
          field: "region",
          operator: "eq",
          value: "capital",
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

  const getAllFilterData = async () => {
    const { data: terminalsData } = await apiClient.api.terminals.cached.get({
      $fetch: {
        headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      },
    });
    if (terminalsData && Array.isArray(terminalsData)) {
      setTerminals(sortBy(terminalsData, (item) => item.name));
    }
  };

  useEffect(() => {
    getAllFilterData();
  }, []);

  const columns = [
    {
      title: "№",
      dataIndex: "order_number",
      width: 60,
      excelRender: (value: any, record: any, index: number) => index + 1,
      render: (value: any, record: any, index: number) => (
        <div>{index + 1}</div>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 120,
      render: (value: any, record: any) => {
        if (record.courier_id) {
          return (
            <Tag color={record.order_status.color}>
              <div
                style={{
                  fontWeight: 800,
                  color: "#000",
                  textTransform: "uppercase",
                }}
              >
                {record.order_status.name}
              </div>
            </Tag>
          );
        }
      },
    },
    {
      title: "Дата заказа",
      dataIndex: "created_at",
      width: 150,
      excelRender: (value: any) => dayjs(value).format("DD.MM.YYYY HH:mm"),
      render: (value: any) => (
        <div>{dayjs(value).format("DD.MM.YYYY HH:mm")}</div>
      ),
    },
    {
      title: "Номер заказа",
      dataIndex: "order_number",
      width: 200,
      render: (value: any, record: any) => (
        <Space>
          {value}
          <Button
            icon={<ArrowTopRightOnSquareIcon />}
            size="small"
            onClick={() => window.open(`/orders/show/${record.id}`)}
          />
        </Space>
      ),
    },
    {
      title: "Филиал",
      dataIndex: "terminals.name",
      width: 200,
      render: (value: any, record: any) => <div>{record.terminals.name}</div>,
    },
    {
      title: "Дистанция",
      dataIndex: "pre_distance",
      width: 100,
      render: (value: any, record: any) =>
        `${+record.pre_distance.toFixed(2)} км`,
    },
    {
      title: "Стоимость заказа",
      dataIndex: "order_price",
      width: 150,
      // sorter: (a: any, b: any) => a.order_price - b.order_price,
      // defaultSortOrder: "descend" as SortOrder | undefined,
      excelRender: (value: any) => +value,
      render: (value: string) => new Intl.NumberFormat("ru-RU").format(+value),
    },
    {
      title: "Тип оплаты",
      dataIndex: "payment_type",
      width: 100,
    },
    {
      title: "Отправить Яндексом",
      dataIndex: "allowYandex",
      width: 300,
      render: (value: any, record: any) => (
        <Space direction="vertical">
          <SendOrderToYandex
            order={record as IOrders}
            token={identity?.token.accessToken!}
          />
          <TrySendMultiYandex
            order={record as IOrders}
            token={identity?.token.accessToken!}
          />
          {/* <ResentToYandex
            order={record as IOrders}
            token={identity?.token.accessToken!}
          /> */}
        </Space>
      ),
    },
  ];

  return (
    <>
      <List title="Упущенные заказы">
        <Form
          layout="vertical"
          {...searchFormProps}
          initialValues={{
            created_at: [dayjs().startOf("d"), dayjs().endOf("d")],
          }}
        >
          <Row gutter={16} align="bottom">
            <Col xs={12} sm={12} md={5}>
              <Form.Item label="Дата заказа" name="created_at">
                <RangePicker
                  format={"DD.MM.YYYY HH:mm"}
                  showTime
                  presets={rangePresets}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={12} md={3}>
              <Form.Item name="region" label="Региональность" initialValue="capital">
                <Select
                  allowClear
                  options={[
                    {
                      label: "Столица",
                      value: "capital",
                    },
                    {
                      label: "Регион",
                      value: "region",
                    }
                  ]}
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
                  {terminalsList.map((terminal: any) => (
                    <Select.Option key={terminal.id} value={terminal.id}>
                      {terminal.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={12} md={2}>
              <Form.Item name="order_number" label="Номер заказа">
                <Input allowClear />
              </Form.Item>
            </Col>
            <Col xs={12} sm={12} md={3}>
              <Form.Item
                name="need_action"
                label="Взять в работу"
                valuePropName="checked"
              >
                <Checkbox />
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
            scroll={
              window.innerWidth < 768
                ? undefined
                : { y: "calc(100vh - 390px)", x: "calc(100vw - 350px)" }
            }
            pagination={{
              ...tableProps.pagination,
              showSizeChanger: true,
            }}
            columns={columns}
          />
        </div>
      </List>
    </>
  );
};

export default MissedOrdersList;

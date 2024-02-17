import { Col, Form, Row, DatePicker, Button, Table } from "antd";
import { rangePresets } from "@admin/src/components/dates/RangePresets";
import { Excel } from "@admin/src/components/export/src";
import dayjs from "dayjs";
import {
  IManagerWithdraw,
  IManagerWithdrawTransactions,
  IUsers,
} from "@admin/src/interfaces";
import { gql } from "graphql-request";
import { client } from "@admin/src/graphConnect";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useGetIdentity } from "@refinedev/core";
import { ExportOutlined } from "@ant-design/icons";
import {
  ManagerWithdrawWithRelations,
  ManagerWithdrawTransactionsWithRelations,
} from "@api/src/modules/manager_withdraw/dto/list.dto";
import { UsersModel } from "@api/src/modules/user/dto/list.dto";
import { apiClient } from "@admin/src/eden";

const { RangePicker } = DatePicker;

const CourierWithdraws = ({ user }: { user: UsersModel }) => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<ManagerWithdrawWithRelations[]>([]);
  const { handleSubmit, control, getValues } = useForm<{
    created_at: [dayjs.Dayjs, dayjs.Dayjs];
  }>({
    defaultValues: {
      created_at: [dayjs().startOf("w"), dayjs().endOf("w")],
    },
  });

  const onSubmit = async (data: any) => {
    loadData();
  };

  const loadData = async () => {
    setIsLoading(true);

    const { created_at } = getValues();

    const { data } = await apiClient.api.manager_withdraw.get({
      $query: {
        limit: "100",
        offset: "0",
        fields:
          "id,amount,amount_before,amount_after,created_at,payed_date,managers.first_name,managers.last_name,terminals.name",
        filters: JSON.stringify([
          {
            field: "created_at",
            operator: "gte",
            value: created_at[0].toISOString(),
          },
          {
            field: "created_at",
            operator: "lte",
            value: created_at[1].toISOString(),
          },
          {
            field: "courier_id",
            operator: "eq",
            value: user.id,
          },
        ]),
      },
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });

    if (data && data.data && Array.isArray(data.data)) {
      setData(data.data);
    }

    setIsLoading(false);
  };

  const columns = [
    {
      title: "Дата",
      dataIndex: "created_at",
      key: "created_at",
      exportable: true,
      render: (value: string) => dayjs(value).format("DD.MM.YYYY HH:mm"),
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

  const exportData = async () => {
    setIsLoading(true);
    const excel = new Excel();
    excel
      .addSheet("test")
      .addColumns(columns.filter((c) => c.exportable !== false))
      .addDataSource(data, {
        str2Percent: true,
      })
      .saveAs(`Выплаты ${user.first_name} ${user.last_name}.xlsx`);

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    return () => {};
  }, []);
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <h1>Выплаты</h1>
        <Button type="default" icon={<ExportOutlined />} onClick={exportData}>
          Экспорт
        </Button>
      </div>
      <Form onFinish={handleSubmit(onSubmit)}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Дата">
              <Controller
                name="created_at"
                control={control}
                render={({ field }) => (
                  <RangePicker
                    {...field}
                    showTime
                    format="DD.MM.YYYY HH:mm"
                    presets={rangePresets}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              Фильтровать
            </Button>
          </Col>
        </Row>
      </Form>
      <Table
        dataSource={data}
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
          pageSize: 200,
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
                  <Table.Summary.Cell index={0} colSpan={3}>
                    Итого
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    {new Intl.NumberFormat("ru-RU").format(total)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    {new Intl.NumberFormat("ru-RU").format(amountBefore)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    {new Intl.NumberFormat("ru-RU").format(amountAfter)}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            </>
          );
        }}
      />
    </>
  );
};

export const ManagerWithdrawTransactions = ({
  record,
}: {
  record: ManagerWithdrawWithRelations;
}) => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [data, setData] = useState<ManagerWithdrawTransactionsWithRelations[]>(
    []
  );

  const loadData = async () => {
    const { data } = await apiClient.api.manager_withdraw[
      record.id
    ].transactions.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });

    if (data && Array.isArray(data)) {
      setData(data);
    }
  };

  const columns = [
    {
      title: "Номер заказа",
      dataIndex: "orders",
      key: "orders",
      exportable: true,
      render: (value: string, record: any) => {
        if (!record.orders) return "";
        return record.orders.order_number;
      },
    },
    {
      title: "Дата зачисления в кошелёк",
      dataIndex: "order_transactions",
      key: "order_transactions",
      exportable: true,
      render: (value: string, record: any) =>
        dayjs(record.order_transactions.created_at).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Дата заказа",
      dataIndex: "orders",
      key: "orders",
      exportable: true,
      render: (value: string, record: any) => {
        if (!record.orders) return "";
        return dayjs(record.orders.created_at).format("DD.MM.YYYY HH:mm");
      },
    },
    {
      title: "Выплачено",
      dataIndex: "amount",
      key: "amount",
      exportable: true,
      excelRender: (value: number) => +value,
      render: (value: string) => new Intl.NumberFormat("ru-RU").format(+value),
    },
  ];

  useEffect(() => {
    loadData();

    return () => {};
  }, []);
  return (
    <>
      <Table
        dataSource={data}
        rowKey="id"
        bordered
        size="small"
        columns={columns}
        pagination={{
          pageSize: 200,
        }}
      />
    </>
  );
};

export default CourierWithdraws;

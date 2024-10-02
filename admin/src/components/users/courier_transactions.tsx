import { CanAccess, useGetIdentity } from "@refinedev/core";
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { rangePresets } from "@admin/src/components/dates/RangePresets";
import { ExportOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { IOrderTransactions } from "@admin/src/interfaces";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { GrShare } from "react-icons/gr";
import { Excel } from "@admin/src/components/export/src";
import { IconContext } from "react-icons/lib";
import { useModalForm } from "@refinedev/antd";
import { terminals, organization } from "@api/drizzle/schema";
import { UsersModel } from "@api/src/modules/user/dto/list.dto";
import { apiClient } from "@admin/src/eden";

const { RangePicker } = DatePicker;

const CourierTransactions = ({
  user,
  terminalsList,
  organizations,
}: {
  user: UsersModel;
  terminalsList: (typeof terminals.$inferSelect)[];
  organizations: (typeof organization.$inferSelect)[];
}) => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<IOrderTransactions[]>([]);
  const { handleSubmit, control, getValues } = useForm<{
    created_at: [dayjs.Dayjs, dayjs.Dayjs];
    status: string;
  }>({
    defaultValues: {
      created_at: [dayjs().startOf("w"), dayjs().endOf("w")],
    },
  });

  const {
    modalProps: createModalProps,
    formProps: createFormProps,
    show: createModalShow,
  } = useModalForm<IOrderTransactions>({
    action: "create",
    resource: "order_transactions",
    redirect: false,
    autoResetForm: true,
    onMutationSuccess: () => {
      loadData();
    },

    initialValues: {
      courier_id: user.id,
    },
    meta: {
      pluralize: true,
      fields: ["id"],
      hiddenValues: {
        courier_id: user.id,
      },
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const onSubmit = async (data: any) => {
    loadData();
  };

  const loadData = async () => {
    setIsLoading(true);

    const { created_at, status } = getValues();

    const filters = [
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
    ];

    if (status) {
      filters.push({
        field: "status",
        operator: "eq",
        value: status,
      });
    }

    const { data } = await apiClient.api.order_transactions.get({
      $query: {
        filters: JSON.stringify(filters),
      },
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    if (data && Array.isArray(data)) {
      setData(data);
    }
    setIsLoading(false);
  };

  const columns = [
    {
      title: "№",
      dataIndex: "created_at",
      key: "created_at",
      exportable: true,
      render: (value: string, record: IOrderTransactions, index: number) =>
        index + 1,
    },
    {
      title: "Дата",
      dataIndex: "created_at",
      key: "created_at",
      exportable: true,
      render: (value: string) => dayjs(value).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Тип транзакции",
      dataIndex: "transaction_type",
      key: "transaction_type",
      exportable: true,
      render: (value: string) => value,
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      exportable: true,
      excelRender: (value: string) =>
        value === "success" ? "Оплачено" : "Не оплачено",
      render: (value: string) => {
        switch (value) {
          case "success":
            return <Tag color="#87d068">Оплачено</Tag>;
          default:
            return <Tag color="#f50">Не оплачено</Tag>;
        }
      },
    },
    {
      title: "Заказ",
      dataIndex: "order_id",
      key: "order_id",
      exportable: true,
      excelRender: (value: any, record: any) =>
        record.order_number ? record.order_number : "",
      render: (value: any, record: any) =>
        record.order_id ? (
          <div>
            {record.order_number}{" "}
            <Button
              type="primary"
              size="small"
              onClick={() => window.open(`/orders/show/${record.order_id}`)}
              icon={
                <IconContext.Provider
                  value={{
                    color: "white",
                  }}
                >
                  <GrShare color="white" />
                </IconContext.Provider>
              }
            />
          </div>
        ) : (
          ""
        ),
    },
    {
      title: "Филиал",
      dataIndex: "terminal_name",
      key: "terminal_name",
      exportable: true,
      excelRender: (value: any) => value ?? "",
      render: (value: any) => value ?? "",
    },
    {
      title: "Кто добавил",
      dataIndex: "last_name",
      key: "last_name",
      exportable: true,
      excelRender: (value: any, record: any) =>
        record.last_name
          ? `${record.first_name} ${record.last_name}`
          : "Система",
      render: (value: any, record: any) =>
        record.last_name
          ? `${record.first_name} ${record.last_name}`
          : "Система",
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      key: "comment",
      exportable: true,
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      exportable: true,
      excelRender: (value: number) => +value,
      render: (value: string) => new Intl.NumberFormat("ru-RU").format(+value),
    },
    {
      title: "Не оплачено",
      dataIndex: "not_paid_amount",
      key: "not_paid_amount",
      exportable: true,
      excelRender: (value: number) => +value,
      render: (value: string) => new Intl.NumberFormat("ru-RU").format(+value),
    },
    {
      title: "Кошелёк до",
      dataIndex: "balance_before",
      key: "balance_before",
      exportable: true,
      excelRender: (value: number) => +value,
      render: (value: string) => new Intl.NumberFormat("ru-RU").format(+value),
    },
    {
      title: "Кошелёк после",
      dataIndex: "balance_after",
      key: "balance_after",
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
      .saveAs(`Начисления ${user.first_name} ${user.last_name}.xlsx`);

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
        <h1>Начисления</h1>
        <Space>
          <Button type="default" icon={<ExportOutlined />} onClick={exportData}>
            Экспорт
          </Button>
          <CanAccess resource="order_transactions" action="create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => createModalShow()}
            >
              Добавить
            </Button>
          </CanAccess>
        </Space>
      </div>
      <Form onFinish={handleSubmit(onSubmit)}>
        <Row gutter={16}>
          <Col span={6}>
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
          <Col span={6}>
            <Form.Item label="Статус">
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select {...field} allowClear>
                    <Select.Option value="success">Оплачено</Select.Option>
                    <Select.Option value="pending">Не оплачено</Select.Option>
                  </Select>
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
        pagination={{
          pageSize: 200,
        }}
      />
      <Modal {...createModalProps}>
        <Form {...createFormProps} layout="vertical">
          <Form.Item
            label="Сумма"
            name="amount"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              formatter={(value: any) =>
                new Intl.NumberFormat("ru-RU").format(+value)
              }
              parser={(value: any) => value?.toString().replace(/\s?/g, "")}
            />
          </Form.Item>
          <Form.Item
            label="Филиал"
            name="terminal_id"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select>
              {terminalsList.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Комментарий"
            name="comment"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="courier_id" hidden></Form.Item>
          <Form.Item name="transaction_type" hidden></Form.Item>
          <Form.Item name="organization_id" hidden></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// const CourierTransactionsBlock = block(CourierTransactions, { ssr: false });
export default CourierTransactions;

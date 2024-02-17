import { PageHeader } from "@refinedev/antd";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Row,
  Select,
  Space,
  Spin,
  Table,
} from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { useGetIdentity, useTranslate } from "@refinedev/core";
import {
  CourierEfficiencyReportItem,
  ITerminals,
  IUsers,
} from "@admin/src/interfaces";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import { gql } from "graphql-request";
import { client } from "@admin/src/graphConnect";
import { sortBy } from "lodash";
import { Excel } from "@admin/src/components/export/src";
import { rangePresets } from "@admin/src/components/dates/RangePresets";
import { FaWalking } from "react-icons/fa";
import { AiFillCar } from "react-icons/ai";
import { MdDirectionsBike } from "react-icons/md";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import { CourierEfficiencyDetails } from "@admin/src/components/orders/courierEfficiencyDetails";
import CourierDriveTypeIcon from "@admin/src/components/users/courier_drive_type_icon";
import { terminals, users } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { apiClient } from "@admin/src/eden";

const { RangePicker } = DatePicker;

const CourierEfficiency = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [couriersList, setCouriersList] = useState<
    InferSelectModel<typeof users>[]
  >([]);
  const [terminalsList, setTerminals] = useState<
    InferSelectModel<typeof terminals>[]
  >([]);
  const [efficiencyData, setEfficiencyData] = useState<any[]>([]);
  const { handleSubmit, control, getValues } = useForm<{
    created_at: [dayjs.Dayjs, dayjs.Dayjs];
    courier_id: string;
    terminal_id: string[];
    status: "active" | "inactive" | "blocked";
  }>({
    defaultValues: {
      created_at: [dayjs().startOf("d"), dayjs().endOf("d")],
      courier_id: undefined,
      terminal_id: undefined,
      status: "active",
    },
  });
  const tr = useTranslate();

  const onSubmit = async (data: any) => {
    loadData();
  };

  const fetchAllData = async () => {
    const { data: terminals } = await apiClient.api.terminals.cached.get({
      $fetch: {
        headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      },
    });
    if (terminals && Array.isArray(terminals)) {
      setTerminals(sortBy(terminals, ["name"]));
    }
    const { data: couriers } = await apiClient.api.couriers.all.get({
      $fetch: {
        headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      },
    });
    if (couriers && Array.isArray(couriers)) {
      setCouriersList(couriers);
    }
  };

  const columns = [
    {
      title: "№",
      dataIndex: "id",
      width: 50,
      render: (value: string, record: any, index: number) => index + 1,
    },
    {
      title: "Курьер",
      dataIndex: "first_name",
      width: 100,
      textWrap: "word-break",
      excelRender: (value: string, record: any) =>
        `${record.first_name} ${record.last_name}`,
      render: (value: string, record: any) => {
        return (
          <>
            {record.first_name} {record.last_name}{" "}
            <CourierDriveTypeIcon driveType={record.drive_type} />
          </>
        );
      },
    },
    {
      title: "Телефон",
      dataIndex: "phone",
      width: 100,
      textWrap: "word-break",
      excelRender: (value: string) => value,
      render: (value: string, record: any) => {
        return <>{formatPhoneNumberIntl(record.phone)}</>;
      },
    },
    {
      title: "Кол-во обработанных заказов",
      dataIndex: "courier_count",
      width: 100,
      sorter: (a: any, b: any) => a.courier_count - b.courier_count,
      excelRender: (value: string) => value,
      render: (value: string, record: any) => {
        return <>{new Intl.NumberFormat("ru-RU").format(+value)}</>;
      },
    },
    {
      title: "Кол-во всех заказов",
      dataIndex: "total_count",
      width: 100,
      sorter: (a: any, b: any) => a.total_count - b.total_count,
      excelRender: (value: string) => value,
      render: (value: string, record: any) => {
        return <>{new Intl.NumberFormat("ru-RU").format(+value)}</>;
      },
    },
    {
      title: "Эффективность",
      dataIndex: "efficiency",
      width: 50,
      sorter: (a: any, b: any) => a.efficiency - b.efficiency,
      excelRender: (value: string) => value,
      render: (value: string, record: any) => {
        return (
          <>
            {new Intl.NumberFormat("ru-RU").format(
              +Number.parseFloat(value).toFixed(0)
            )}
            %
          </>
        );
      },
    },
    {
      title: "Действия",
      dataIndex: "id",
      width: 50,
      exportable: false,
      render: (value: string, record: any) => {
        return (
          <>
            <CourierEfficiencyDetails data={record.terminals} />
          </>
        );
      },
    },
  ];

  const loadData = async () => {
    setIsLoading(true);

    const { created_at, courier_id, terminal_id, status } = getValues();

    const { data } = await apiClient.api.couriers.efficiency.post({
      startDate: created_at[0].toISOString(),
      endDate: created_at[1].toISOString(),
      courier_id: courier_id,
      terminal_id: terminal_id,
      status: status,
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    if (data && Array.isArray(data)) {
      setEfficiencyData(data);
    }
    setIsLoading(false);
  };

  const exportData = async () => {
    setIsLoading(true);
    const excel = new Excel();
    excel
      .addSheet("test")
      .addColumns(columns.filter((c) => c.exportable !== false))
      .addDataSource(sortBy(efficiencyData, ["efficiency"]), {
        str2Percent: true,
      })
      .saveAs("Эффективность.xlsx");

    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllData();
    loadData();

    return () => {};
  }, []);

  return (
    <>
      <PageHeader
        title="Эффективность курьеров"
        ghost={false}
        extra={
          <Space>
            <Button
              type="default"
              icon={<ExportOutlined />}
              onClick={exportData}
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
                  <Button type="primary" htmlType="submit" loading={isLoading}>
                    Фильтровать
                  </Button>
                </Space>,
              ]}
            >
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
                          {terminalsList.map((terminal) => (
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
              </Row>
            </Card>
          </Form>
          <Table
            dataSource={sortBy(efficiencyData, ["efficiency"])}
            rowKey="id"
            bordered
            size="small"
            columns={columns}
            pagination={{
              pageSize: 200,
            }}
          />
        </Spin>
      </PageHeader>
    </>
  );
};

export default CourierEfficiency;

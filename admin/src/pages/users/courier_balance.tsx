import { PageHeader } from "@refinedev/antd";
import { Button, Card, Col, Form, Row, Select, Space, Spin, Table } from "antd";
import { useGetIdentity, useTranslate } from "@refinedev/core";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import { ExportOutlined } from "@ant-design/icons";
import { Excel } from "@admin/src/components/export/src";
import { sortBy } from "lodash";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import CourierWithdrawModal from "@admin/src/components/orders/courier_withdraw_modal";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import CourierDriveTypeIcon from "@admin/src/components/users/courier_drive_type_icon";
import { apiClient } from "@admin/src/eden";
import { users, terminals } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { WalletStatus } from "@api/src/modules/user/dto/list.dto";

dayjs.extend(utc);
dayjs.extend(timezone);

const CourierBalance = () => {
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
  const [wallet, setWallet] = useState<WalletStatus[]>([]);
  const { handleSubmit, control, watch } = useForm<{
    courier_id: string[] | undefined;
    terminal_id: string[] | undefined;
    status: ("active" | "inactive" | "blocked")[] | undefined;
  }>({
    defaultValues: {
      courier_id: undefined,
      terminal_id: undefined,
      status: ["active"],
    },
  });

  const tr = useTranslate();
  const courier_id = watch("courier_id");
  const terminal_id = watch("terminal_id");
  const status = watch("status");

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
    //       }
    //     ) {
    //       first_name
    //       last_name
    //       id
    //     }
    //   }
    // `;
    // const { cachedTerminals, users } = await client.request<{
    //   roles: IRoles[];
    //   cachedTerminals: ITerminals[];
    //   workSchedules: IWorkSchedules[];
    //   users: IUsers[];
    // }>(query, {}, { Authorization: `Bearer ${identity?.token.accessToken}` });

    // setCouriersList(users);

    const { data: cachedTerminals } = await apiClient.api.terminals.cached.get({
      $headers: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    });
    if (cachedTerminals && Array.isArray(cachedTerminals)) {
      setTerminals(sortBy(cachedTerminals, ["name"]));
    }
  };

  const onSubmit = async (data: any) => {
    loadData();
  };

  const loadData = async () => {
    setIsLoading(true);

    const { data: couriersTerminalBalance } =
      await apiClient.api.couriers.terminal_balance.post({
        courier_id,
        terminal_id,
        status: status,
        $headers: {
          Authorization: `Bearer ${identity?.token.accessToken}`,
        },
      });
    if (couriersTerminalBalance && Array.isArray(couriersTerminalBalance)) {
      setWallet(couriersTerminalBalance);
    }

    setIsLoading(false);
  };

  const columns = [
    {
      title: "№",
      dataIndex: "id",
      width: 50,
      exportable: false,
      render: (value: string, record: any, index: number) => index + 1,
    },
    {
      title: "Курьер",
      dataIndex: "users",
      excelRender: (value: any) => `${value.first_name} ${value.last_name}`,
      render: (value: any, record: any) => {
        return (
          <div>
            {value.first_name} {value.last_name}{" "}
            <CourierDriveTypeIcon driveType={record.drive_type} />
          </div>
        );
      },
    },
    {
      title: "Телефон",
      dataIndex: "users",
      excelRender: (value: any) => value.phone,
      render: (value: any) => {
        return <div>{formatPhoneNumberIntl(value.phone)}</div>;
      },
    },
    {
      title: "Филиал",
      dataIndex: "terminals",
      excelRender: (value: any) => value.name,
      render: (value: any) => {
        return <div>{value.name}</div>;
      },
    },
    {
      title: "Баланс",
      dataIndex: "balance",
      excelRender: (value: any) => value,
      render: (value: any) => {
        return <div>{new Intl.NumberFormat("ru-RU").format(+value)}</div>;
      },
    },
    {
      title: "Действия",
      dataIndex: "id",
      width: 50,
      exportable: false,
      render: (value: string, record: any) => {
        return (
          <CourierWithdrawModal
            order={record}
            onWithdraw={() => loadData()}
            identity={identity}
          />
        );
      },
    },
  ];

  const exportData = async () => {
    setIsLoading(true);
    const excel = new Excel();
    excel
      .addSheet("test")
      .addColumns(columns.filter((c) => c.exportable !== false))
      .addDataSource(wallet, {
        str2Percent: true,
      })
      .saveAs("Кошелёк.xlsx");

    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllData();
    loadData();

    return () => {};
  }, [identity]);

  return (
    <div>
      <PageHeader
        title="Кошелёк"
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
                  <Button type="primary" htmlType="submit">
                    Фильтровать
                  </Button>
                </Space>,
              ]}
            >
              <Row gutter={16}>
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
                          mode="multiple"
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
          <Card bordered={false}>
            <Table
              dataSource={wallet}
              rowKey="id"
              bordered
              size="small"
              columns={columns}
              pagination={{
                pageSize: 200,
              }}
            />
          </Card>
        </Spin>
      </PageHeader>
    </div>
  );
};

export default CourierBalance;

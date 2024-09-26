import { useGetIdentity, useShow, useTranslate } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Descriptions, Col, Row, Tag, Tabs } from "antd";
import dayjs from "dayjs";
import { IOrganization, ITerminals, IUsers } from "@admin/src/interfaces";
import "dayjs/locale/ru";
import duration from "dayjs/plugin/duration";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import UserRollCallList from "@admin/src/components/users/user_roll_call";
import CourierWithdraws from "@admin/src/components/users/courier_withdraws";
import CourierEffectiveness from "@admin/src/components/users/courier_effectiveness";
import CourierTransactions from "@admin/src/components/users/courier_transactions";
import { useEffect, useState } from "react";
import { sortBy } from "lodash";
import { organization, terminals } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { apiClient } from "@admin/src/eden";
import { UsersModel } from "@api/src/modules/user/dto/list.dto";

dayjs.locale("ru");
dayjs.extend(duration);

const UsersShow = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [terminalsList, setTerminals] = useState<
    InferSelectModel<typeof terminals>[]
  >([]);
  const [organizations, setOrganizations] = useState<
    InferSelectModel<typeof organization>[]
  >([]);
  const tr = useTranslate();

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

  const { queryResult } = useShow<UsersModel>({
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
        "terminals.id",
        "terminals.name",
        "work_schedules.id",
        "work_schedules.name",
        "roles.id",
        "roles.name",
      ],
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  useEffect(() => {
    getAllFilterData();
    return () => {};
  }, [identity]);
  const { data, isLoading } = queryResult;

  const record = data?.data;

  return (
    <Show
      isLoading={isLoading}
      title={`Пользователь ${record?.last_name} ${record?.first_name}`}
    >
      <Tabs defaultActiveKey="main">
        <Tabs.TabPane tab="Основная информация" key="main">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Descriptions bordered>
                <Descriptions.Item label="Дата создания" span={3}>
                  {dayjs(record?.created_at).format("DD.MM.YYYY HH:mm")}
                </Descriptions.Item>
                <Descriptions.Item label="Статус" span={3}>
                  {tr(`users.status.${record?.status}`)}
                </Descriptions.Item>
                <Descriptions.Item label="Имя" span={3}>
                  {record?.first_name}
                </Descriptions.Item>
                <Descriptions.Item label="Фамилия" span={3}>
                  {record?.last_name}
                </Descriptions.Item>
                <Descriptions.Item label="Телефон" span={3}>
                  {formatPhoneNumberIntl(record?.phone ?? "")}
                </Descriptions.Item>
                {record?.drive_type && (
                  <Descriptions.Item label="Тип водителя" span={3}>
                    {tr("deliveryPricing.driveType." + record?.drive_type)}
                  </Descriptions.Item>
                )}
                {record?.terminals && (
                  <Descriptions.Item label="Филиалы" span={3}>
                    {record?.terminals.map((item: any) => (
                      <Tag key={item.id}>{item.name}</Tag>
                    ))}
                  </Descriptions.Item>
                )}
                {record?.work_schedules && (
                  <Descriptions.Item label="График работы" span={3}>
                    {record?.work_schedules.map((item: any) => (
                      <Tag key={item.id}>{item.name}</Tag>
                    ))}
                  </Descriptions.Item>
                )}
                {record?.roles && (
                  <Descriptions.Item label="Роли" span={3}>
                    <Tag>{record.roles.name}</Tag>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Модель автомобиля" span={3}>
                  {record?.car_model}
                </Descriptions.Item>
                <Descriptions.Item label="Номер автомобиля" span={3}>
                  {record?.car_number}
                </Descriptions.Item>
                <Descriptions.Item label="Имя владельца карты" span={3}>
                  {record?.card_name}
                </Descriptions.Item>
                <Descriptions.Item label="Номер карты" span={3}>
                  {record?.card_number}
                </Descriptions.Item>
                <Descriptions.Item
                  label="Максимальное количество активных заказов"
                  span={3}
                >
                  {record?.max_active_order_count}
                </Descriptions.Item>
                {record?.order_start_date && (
                  <Descriptions.Item label="Дата начала работы" span={3}>
                    {dayjs(record?.order_start_date).format("DD.MM.YYYY HH:mm")}
                  </Descriptions.Item>
                )}
                {/* <Descriptions.Item label="Документы" span={3}>
                  {record?.doc_files.map((item: any) => (
                    <Tag key={item.id}>{item.name}</Tag>
                  ))}
                </Descriptions.Item> */}
              </Descriptions>
            </Col>
            <Col xs={24} md={12}>
              {record && <UserRollCallList user={record!} />}
            </Col>
          </Row>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Выплаты" key="withdraws">
          {record && <CourierWithdraws user={record} />}
        </Tabs.TabPane>
        <Tabs.TabPane tab="Начисления" key="transactions">
          {record && (
            <CourierTransactions
              user={record}
              terminalsList={terminalsList}
              organizations={organizations}
            />
          )}
        </Tabs.TabPane>
        <Tabs.TabPane tab="Эффективность" key="efficiency">
          {record && <CourierEffectiveness user={record} />}
        </Tabs.TabPane>
      </Tabs>
    </Show>
  );
};

export default UsersShow;

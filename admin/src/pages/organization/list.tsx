import {
  List,
  DateField,
  useTable,
  EditButton,
  ShowButton,
} from "@refinedev/antd";
import { Table, Switch, Space } from "antd";
import { useGetIdentity, useTranslate } from "@refinedev/core";

import { defaultDateTimeFormat } from "@admin/src/localConstants";
import { organization } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export default function OrganizationList() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { tableProps } = useTable<InferSelectModel<typeof organization>>({
    meta: {
      fields: [
        "id",
        "name",
        "active",
        "created_at",
        "phone",
        "webhook",
        "payment_type",
        "allow_yandex_delivery",
      ],
      whereInputType: "organizationWhereInput!",
      orderByInputType: "organizationOrderByWithRelationInput!",
      operation: "organizations",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },

    sorters: {
      initial: [
        {
          field: "name",
          order: "desc",
        },
      ],
    },
  });
  const tr = useTranslate();
  return (
    <>
      <List title="Список организаций">
        <Table {...tableProps} rowKey="id">
          <Table.Column
            dataIndex="active"
            title="Активность"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column
            dataIndex="allow_yandex_delivery"
            title="Включить Яндекс доставку"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column dataIndex="name" title="Название" />
          <Table.Column dataIndex="phone" title="Телефон" />
          <Table.Column dataIndex="webhook" title="Вебхук" />
          <Table.Column
            dataIndex="payment_type"
            title="Тип оплаты"
            render={(value) => `${tr("organizations.paymentType." + value)}`}
          />
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
          <Table.Column<InferSelectModel<typeof organization>>
            title="Действия"
            dataIndex="actions"
            render={(_text, record): React.ReactNode => {
              return (
                <Space>
                  <EditButton size="small" recordItemId={record.id} hideText />
                  <ShowButton size="small" recordItemId={record.id} hideText />
                </Space>
              );
            }}
          />
        </Table>
      </List>
    </>
  );
}

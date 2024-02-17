import {
  List,
  DateField,
  useTable,
  EditButton,
  ShowButton,
} from "@refinedev/antd";
import { Table, Switch, Space } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { defaultDateTimeFormat } from "@admin/src/localConstants";
import { OrderBonusPricingWithRelations } from "@api/src/modules/order_bonus_pricing/dto/list.dto";

export const OrderBonusPricingList: React.FC = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { tableProps } = useTable<OrderBonusPricingWithRelations>({
    meta: {
      fields: ["id", "name", "organization.id", "organization.name", "active"],
      whereInputType: "order_bonus_pricingWhereInput!",
      orderByInputType: "order_bonus_pricingOrderByWithRelationInput!",
      operation: "orderBonusPricings",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
    pagination: {
      pageSize: 200,
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
  return (
    <>
      <List title="Список условий бонуса к заказу">
        <Table {...tableProps} rowKey="id">
          <Table.Column
            dataIndex="active"
            title="Активность"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column dataIndex="name" title="Название" />
          <Table.Column
            dataIndex="organization.name"
            title="Организация"
            render={(value: any, record: OrderBonusPricingWithRelations) =>
              record?.organization?.name
            }
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
          <Table.Column<OrderBonusPricingWithRelations>
            title="Actions"
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
};

import {
  List,
  DateField,
  useTable,
  EditButton,
  ShowButton,
} from "@refinedev/antd";
import { Table, Switch, Space } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { IDeliveryPricing } from "@admin/src/interfaces";
import { defaultDateTimeFormat } from "@admin/src/localConstants";
import { delivery_pricing } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { DeliveryPricingWithRelations } from "@api/src/modules/delivery_pricing/dto/list.dto";

export const DeliveryPricingList: React.FC = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { tableProps } = useTable<DeliveryPricingWithRelations>({
    meta: {
      fields: ["id", "name", "organization.id", "organization.name", "active"],
      whereInputType: "delivery_pricingWhereInput!",
      orderByInputType: "delivery_pricingOrderByWithRelationInput!",
      operation: "deliveryPricings",
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
  return (
    <>
      <List title="Список условий доставки">
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
            render={(value: any, record: DeliveryPricingWithRelations) =>
              record.organization.name
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
          <Table.Column<DeliveryPricingWithRelations>
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

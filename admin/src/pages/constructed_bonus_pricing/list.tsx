import {
  List,
  DateField,
  useTable,
  EditButton,
  ShowButton,
} from "@refinedev/antd";
import { Table, Space } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { defaultDateTimeFormat } from "@admin/src/localConstants";
import { constructed_bonus_pricing } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { ConstructedBonusPricingListWithRelations } from "@api/src/modules/constructed_bonus_pricing/dtos/list.dto";

export const ConstructedBonusPricingList: React.FC = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { tableProps } = useTable<
    InferSelectModel<typeof constructed_bonus_pricing>
  >({
    meta: {
      fields: ["id", "name", "organization.id", "organization.name"],
      whereInputType: "constructed_bonus_pricingWhereInput!",
      orderByInputType: "constructed_bonus_pricingOrderByWithRelationInput!",
      operation: "constructedBonusPricings",
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
          <Table.Column dataIndex="name" title="Название" />
          <Table.Column
            dataIndex="organization.name"
            title="Организация"
            render={(
              value: any,
              record: ConstructedBonusPricingListWithRelations
            ) => record?.organization?.name}
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
          <Table.Column<InferSelectModel<typeof constructed_bonus_pricing>>
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

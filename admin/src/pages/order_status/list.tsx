import { List, useTable, EditButton } from "@refinedev/antd";
import { Table, Switch, Space } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { OrderStatusWithRelations } from "@api/src/modules/order_status/dto/list.dto";

export default function OrderStatusList() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { tableProps } = useTable<OrderStatusWithRelations>({
    meta: {
      fields: [
        "id",
        "name",
        "sort",
        "color",
        "finish",
        "cancel",
        "waiting",
        "need_location",
        "on_way",
        "in_terminal",
        "should_pay",
        "yandex_delivery_statuses",
        "organization.id",
        "organization.name",
      ],
      whereInputType: "order_statusWhereInput!",
      orderByInputType: "order_statusOrderByWithRelationInput!",
      operation: "orderStatuses",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },

    sorters: {
      initial: [
        {
          field: "sort",
          order: "asc",
        },
      ],
    },
  });
  return (
    <>
      <List title="Статусы заказов">
        <Table {...tableProps} rowKey="id">
          <Table.Column dataIndex="sort" title="Сортировка" />
          <Table.Column dataIndex="name" title="Название" />
          <Table.Column
            dataIndex="organization.name"
            title="Организация"
            render={(value: any, record: OrderStatusWithRelations) =>
              record.organization.name
            }
          />
          <Table.Column
            dataIndex="finish"
            title="Завершающий"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column
            dataIndex="cancel"
            title="Отменяющий"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column
            dataIndex="waiting"
            title="Ожидающий гостя"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column
            dataIndex="need_location"
            title="Требует местоположение"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column
            dataIndex="in_terminal"
            title="В филиале"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column
            dataIndex="on_way"
            title="В пути"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column
            dataIndex="should_pay"
            title="Выплатить курьеру"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column
            dataIndex="yandex_delivery_statuses"
            title="Статусы в Яндекс.Доставке"
          />
          <Table.Column
            dataIndex="color"
            title="Цвет"
            render={(value) => (
              <div
                style={{
                  backgroundColor: value,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                }}
              ></div>
            )}
          />
          <Table.Column<OrderStatusWithRelations>
            title="Actions"
            dataIndex="actions"
            render={(_text, record): React.ReactNode => {
              return (
                <Space>
                  <EditButton size="small" recordItemId={record.id} hideText />
                </Space>
              );
            }}
          />
        </Table>
      </List>
    </>
  );
}

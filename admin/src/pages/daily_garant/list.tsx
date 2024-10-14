import {
  List,
  DateField,
  useTable,
  EditButton,
  ShowButton,
} from "@refinedev/antd";
import { Table, Space } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { IWorkSchedules } from "@admin/src/interfaces";
import {
  defaultDateTimeFormat,
  defaultTimeFormat,
} from "@admin/src/localConstants";
import { daily_garant } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export default function DailyGarantList() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { tableProps } = useTable<InferSelectModel<typeof daily_garant>>({
    meta: {
      fields: ["id", "name", "date", "amount", "late_minus_sum"],
      whereInputType: "daily_garantWhereInput!",
      orderByInputType: "daily_garantOrderByWithRelationInput!",
      operation: "dailyGarants",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },

    sorters: {
      initial: [
        {
          field: "name",
          order: "asc",
        },
      ],
    },
  });
  return (
    <>
      <List title="Список тарифов дневного гаранта">
        <Table {...tableProps} rowKey="id">
          <Table.Column dataIndex="name" title="Название" />
          <Table.Column
            dataIndex="date"
            title="Время"
            render={(value: any) => (
              <DateField
                format={defaultTimeFormat}
                value={value}
                locales="ru"
              />
            )}
          />
          <Table.Column
            dataIndex="amount"
            title="Сумма"
            render={(value: string) =>
              new Intl.NumberFormat("ru-RU").format(+value)
            }
          />
          <Table.Column
            dataIndex="late_minus_sum"
            title="Сумма штрафа"
            render={(value: string) =>
              new Intl.NumberFormat("ru-RU").format(+value)
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
          <Table.Column<InferSelectModel<typeof daily_garant>>
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

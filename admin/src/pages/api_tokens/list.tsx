import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { Table, Switch, Space, Button } from "antd";
import { useCopyToClipboard } from "usehooks-ts";

import { IApiTokens } from "@admin/src/interfaces";
import { useGetIdentity, useNotification } from "@refinedev/core";
import { api_tokens } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";
import { ApiTokensWithRelations } from "@api/src/modules/api_tokens/dto/list.dto";

export default function ApiTokensList() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const [value, copy] = useCopyToClipboard();
  const { open } = useNotification();
  const { tableProps } = useTable<ApiTokensWithRelations>({
    meta: {
      fields: ["id", "token", "active", "organization.id", "organization.name"],
      whereInputType: "api_tokensWhereInput!",
      orderByInputType: "api_tokensOrderByWithRelationInput!",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },

    sorters: {
      initial: [],
    },
  });

  const copyToken = (token: string) => {
    copy(token);
    open!({
      message: "Token copied",
      type: "success",
    });
  };

  return (
    <>
      <List title="API Токены">
        <Table {...tableProps} rowKey="id">
          <Table.Column
            dataIndex="active"
            title="Активный"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column
            dataIndex="token"
            title="Токен"
            render={(value) => (
              <div>
                {value}{" "}
                <Button type="link" onClick={() => copyToken(value)}>
                  Copy
                </Button>
              </div>
            )}
          />
          <Table.Column
            dataIndex="organization.name"
            title="Организация"
            render={(value: any, record: ApiTokensWithRelations) =>
              record.organization.name
            }
          />
          <Table.Column<ApiTokensWithRelations>
            title="Actions"
            dataIndex="actions"
            render={(_text, record): React.ReactNode => {
              return (
                <Space>
                  <EditButton size="small" recordItemId={record.id} hideText />
                  <DeleteButton
                    size="small"
                    recordItemId={record.id}
                    hideText
                  />
                </Space>
              );
            }}
          />
        </Table>
      </List>
    </>
  );
}

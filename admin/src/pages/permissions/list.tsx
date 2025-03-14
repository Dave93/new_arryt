import {
  List,
  DateField,
  useTable,
  EditButton,
  useDrawerForm,
  Edit,
} from "@refinedev/antd";
import { Table, Switch, Space, Drawer, Form, Input } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { defaultDateTimeFormat } from "@admin/src/localConstants";
import { permissions } from "@api/drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export default function PermissionsList() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const {
    drawerProps,
    formProps,
    show,
    saveButtonProps,
    deleteButtonProps,
    id,
  } = useDrawerForm<InferSelectModel<typeof permissions>>({
    action: "edit",
    meta: {
      fields: ["id", "slug", "active", "created_at", "description"],
      pluralize: true,
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  const { tableProps } = useTable<InferSelectModel<typeof permissions>>({
    meta: {
      fields: ["id", "slug", "active", "created_at"],
      whereInputType: "permissionsWhereInput!",
      orderByInputType: "permissionsOrderByWithRelationInput!",
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },

    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc",
        },
      ],
    },
  });
  return (
    <>
      <List title="Список разрешений">
        <Table {...tableProps} rowKey="id">
          <Table.Column
            dataIndex="active"
            title="Активность"
            render={(value) => <Switch checked={value} disabled />}
          />
          <Table.Column dataIndex="slug" title="Код" />
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
          <Table.Column<InferSelectModel<typeof permissions>>
            title="Действия"
            dataIndex="actions"
            render={(_text, record): React.ReactNode => {
              return (
                <Space>
                  <EditButton
                    size="small"
                    recordItemId={record.id}
                    onClick={() => show(record.id)}
                  />
                </Space>
              );
            }}
          />
        </Table>
      </List>
      <Drawer {...drawerProps}>
        <Edit
          saveButtonProps={saveButtonProps}
          deleteButtonProps={deleteButtonProps}
          recordItemId={id}
          title="Редактирование разрешения"
        >
          <Form {...formProps} layout="vertical">
            <Form.Item
              label="Активность"
              name="active"
              valuePropName="checked"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Код"
              name="slug"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Описание"
              name="description"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Form>
        </Edit>
      </Drawer>
    </>
  );
}

import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Switch } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { roles } from "@api/drizzle/schema";
import { InferInsertModel } from "drizzle-orm";

export default function RolesCreate() {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps } = useForm<
    InferInsertModel<typeof roles>
  >({
    meta: {
      fields: ["id", "name", "active", "code", "created_at"],
      pluralize: true,
      requestHeaders: {
        Authorization: `Bearer ${identity?.token.accessToken}`,
      },
    },
  });

  return (
    <Create saveButtonProps={saveButtonProps} title="Создать разрешение">
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Активность"
          name="active"
          rules={[
            {
              required: true,
            },
          ]}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="Название"
          name="name"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Код" name="code">
          <Input />
        </Form.Item>
      </Form>
    </Create>
  );
}

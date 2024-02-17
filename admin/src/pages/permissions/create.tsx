import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Switch } from "antd";
import { useGetIdentity } from "@refinedev/core";

import { permissions } from "@api/drizzle/schema";
import { InferInsertModel } from "drizzle-orm";

export const PermissionsCreate = () => {
  const { data: identity } = useGetIdentity<{
    token: { accessToken: string };
  }>();
  const { formProps, saveButtonProps } = useForm<
    InferInsertModel<typeof permissions>
  >({
    meta: {
      fields: ["id", "slug", "active", "created_at", "description"],
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
    </Create>
  );
};
